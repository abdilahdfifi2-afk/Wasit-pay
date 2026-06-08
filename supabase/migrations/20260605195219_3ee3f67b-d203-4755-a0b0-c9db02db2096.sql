-- ============ TABLES ============
CREATE TABLE public.affiliate_codes (
  user_id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.affiliate_codes TO authenticated;
GRANT ALL ON public.affiliate_codes TO service_role;
ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own code" ON public.affiliate_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own code" ON public.affiliate_codes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  first_order_id uuid,
  first_order_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (referrer_id <> referred_user_id)
);
GRANT SELECT ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referrer or referred view" ON public.affiliate_referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX affiliate_referrals_referrer_idx ON public.affiliate_referrals(referrer_id);

CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  order_id uuid,
  kind text NOT NULL CHECK (kind IN ('first_order','order','bonus')),
  amount numeric NOT NULL CHECK (amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','paid','cancelled')),
  confirm_after timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  paid_ledger_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX affiliate_commissions_order_uniq
  ON public.affiliate_commissions(order_id) WHERE order_id IS NOT NULL;
GRANT SELECT ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliate views own commissions" ON public.affiliate_commissions FOR SELECT TO authenticated
  USING (auth.uid() = affiliate_id OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX affiliate_commissions_aff_idx ON public.affiliate_commissions(affiliate_id, status);

CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  ip_hash text,
  user_agent text,
  referer text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.affiliate_clicks TO anon, authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone log click" ON public.affiliate_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Affiliate views own clicks" ON public.affiliate_clicks FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.affiliate_codes c WHERE c.code = affiliate_clicks.code AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE INDEX affiliate_clicks_code_idx ON public.affiliate_clicks(code, created_at DESC);

-- ============ RPC: get-or-create code ============
CREATE OR REPLACE FUNCTION public.get_or_create_affiliate_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_code text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT code INTO v_code FROM affiliate_codes WHERE user_id = v_uid;
  IF v_code IS NOT NULL THEN RETURN v_code; END IF;
  LOOP
    v_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
    BEGIN
      INSERT INTO affiliate_codes(user_id, code) VALUES (v_uid, v_code);
      RETURN v_code;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;
END $$;

-- ============ RPC: apply referral code at signup ============
CREATE OR REPLACE FUNCTION public.apply_referral_code(_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_ref uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _code IS NULL OR length(trim(_code)) = 0 THEN RETURN; END IF;
  SELECT user_id INTO v_ref FROM affiliate_codes WHERE code = upper(trim(_code));
  IF v_ref IS NULL OR v_ref = v_uid THEN RETURN; END IF;
  INSERT INTO affiliate_referrals(referrer_id, referred_user_id, code)
  VALUES (v_ref, v_uid, upper(trim(_code)))
  ON CONFLICT (referred_user_id) DO NOTHING;
END $$;

-- ============ Trigger: on order completed -> credit affiliate ============
CREATE OR REPLACE FUNCTION public.on_order_completed_affiliate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_ref public.affiliate_referrals%ROWTYPE; v_amount numeric; v_kind text;
BEGIN
  IF NEW.order_status = 'completed' AND OLD.order_status IS DISTINCT FROM 'completed' THEN
    SELECT * INTO v_ref FROM affiliate_referrals WHERE referred_user_id = NEW.buyer_id;
    IF v_ref.id IS NULL THEN RETURN NEW; END IF;
    v_amount := round(COALESCE(NEW.commission, 0) * 0.05, 2);
    IF v_amount <= 0 THEN RETURN NEW; END IF;
    IF v_ref.first_order_id IS NULL THEN
      v_kind := 'first_order';
      UPDATE affiliate_referrals SET first_order_id = NEW.id, first_order_at = now() WHERE id = v_ref.id;
    ELSE
      v_kind := 'order';
    END IF;
    INSERT INTO affiliate_commissions(affiliate_id, referred_user_id, order_id, kind, amount)
    VALUES (v_ref.referrer_id, NEW.buyer_id, NEW.id, v_kind, v_amount)
    ON CONFLICT (order_id) DO NOTHING;
    PERFORM public.notify_user(v_ref.referrer_id, 'عمولة جديدة 💰',
      v_amount::text || ' MAD ' || (CASE WHEN v_kind = 'first_order' THEN '(أول صفقة!)' ELSE '' END),
      '/affiliate');
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_order_completed_affiliate ON public.orders;
CREATE TRIGGER trg_order_completed_affiliate
  AFTER UPDATE OF order_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.on_order_completed_affiliate();

-- ============ RPC: confirm matured commissions + payout to wallet ============
CREATE OR REPLACE FUNCTION public.affiliate_payout()
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_total numeric := 0; v_ledger uuid; r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  -- Auto-confirm matured
  UPDATE affiliate_commissions
    SET status = 'confirmed'
    WHERE affiliate_id = v_uid AND status = 'pending' AND confirm_after <= now();
  SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM affiliate_commissions
    WHERE affiliate_id = v_uid AND status = 'confirmed';
  IF v_total < 50 THEN RAISE EXCEPTION 'الحد الأدنى للسحب 50 MAD (الرصيد: % MAD)', v_total; END IF;
  v_ledger := public.apply_wallet_delta(v_uid, v_total, 'order_credit', 'affiliate_payout', NULL,
    'Affiliate commissions payout');
  UPDATE affiliate_commissions
    SET status = 'paid', paid_ledger_id = v_ledger
    WHERE affiliate_id = v_uid AND status = 'confirmed';
  PERFORM public.notify_user(v_uid, 'تم تحويل عمولاتك ✓', v_total::text || ' MAD أُضيفت إلى محفظتك', '/wallet');
  RETURN v_total;
END $$;