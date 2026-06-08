
-- =========================================
-- 1. WALLET LEDGER TABLE (immutable)
-- =========================================

CREATE TYPE public.wallet_entry_kind AS ENUM (
  'opening_balance',
  'order_credit',
  'withdrawal_hold',
  'withdrawal_refund',
  'withdrawal_complete',
  'admin_adjustment'
);

CREATE TABLE public.wallet_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,           -- signed: +credit, -debit
  balance_after numeric NOT NULL,
  kind public.wallet_entry_kind NOT NULL,
  reference_type text,               -- 'order' | 'withdrawal' | 'admin'
  reference_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid                    -- admin user_id for adjustments
);

-- Idempotency: same (kind, reference_id) can only be inserted once.
-- opening_balance has reference_id = NULL so excluded.
CREATE UNIQUE INDEX wallet_ledger_idempotent
  ON public.wallet_ledger (kind, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX wallet_ledger_user_created_idx
  ON public.wallet_ledger (user_id, created_at DESC);

GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT ALL ON public.wallet_ledger TO service_role;

ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ledger"
  ON public.wallet_ledger FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- No INSERT/UPDATE/DELETE policies => only SECURITY DEFINER funcs can write.


-- =========================================
-- 2. ATOMIC WALLET DELTA FUNCTION
-- =========================================

CREATE OR REPLACE FUNCTION public.apply_wallet_delta(
  _user_id uuid,
  _amount numeric,
  _kind public.wallet_entry_kind,
  _reference_type text DEFAULT NULL,
  _reference_id uuid DEFAULT NULL,
  _notes text DEFAULT NULL,
  _created_by uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_new_balance numeric;
  v_entry_id uuid;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF _amount IS NULL OR _amount = 0 THEN RAISE EXCEPTION 'amount must be non-zero'; END IF;

  -- Idempotency short-circuit: if this exact entry already exists, return it.
  IF _reference_id IS NOT NULL THEN
    SELECT id INTO v_entry_id
      FROM public.wallet_ledger
     WHERE kind = _kind AND reference_id = _reference_id
     LIMIT 1;
    IF v_entry_id IS NOT NULL THEN
      RETURN v_entry_id;
    END IF;
  END IF;

  -- Lock the profile row for the duration of the transaction.
  SELECT wallet_balance INTO v_balance
    FROM public.profiles
   WHERE id = _user_id
   FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found for %', _user_id;
  END IF;

  v_new_balance := v_balance + _amount;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance: have %, need %', v_balance, -_amount;
  END IF;

  UPDATE public.profiles
     SET wallet_balance = v_new_balance
   WHERE id = _user_id;

  INSERT INTO public.wallet_ledger
    (user_id, amount, balance_after, kind, reference_type, reference_id, notes, created_by)
  VALUES
    (_user_id, _amount, v_new_balance, _kind, _reference_type, _reference_id, _notes, _created_by)
  RETURNING id INTO v_entry_id;

  RETURN v_entry_id;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_wallet_delta(uuid, numeric, public.wallet_entry_kind, text, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_wallet_delta(uuid, numeric, public.wallet_entry_kind, text, uuid, text, uuid) TO service_role;


-- =========================================
-- 3. REWIRE EXISTING TRIGGERS TO USE LEDGER
-- =========================================

CREATE OR REPLACE FUNCTION public.on_order_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payout numeric;
BEGIN
  IF NEW.order_status = 'completed' AND OLD.order_status IS DISTINCT FROM 'completed' THEN
    v_payout := NEW.amount - NEW.commission;
    PERFORM public.apply_wallet_delta(
      NEW.seller_id,
      v_payout,
      'order_credit',
      'order',
      NEW.id,
      'Escrow release for order ' || NEW.id::text
    );
    PERFORM public.notify_user(
      NEW.seller_id,
      'Escrow released',
      'Funds for order #' || substr(NEW.id::text, 1, 8) || ' added to your wallet.',
      '/wallet'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_withdrawal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
      PERFORM public.apply_wallet_delta(
        NEW.user_id,
        NEW.amount,
        'withdrawal_refund',
        'withdrawal',
        NEW.id,
        'Refund for rejected withdrawal'
      );
      PERFORM public.notify_user(NEW.user_id, 'Withdrawal rejected',
        COALESCE(NEW.admin_notes, 'Funds returned to your wallet.'), '/wallet');
    ELSIF NEW.status = 'completed' THEN
      -- Mark hold as final (no balance change, hold already debited).
      INSERT INTO public.wallet_ledger
        (user_id, amount, balance_after, kind, reference_type, reference_id, notes)
      SELECT NEW.user_id, 0, p.wallet_balance, 'withdrawal_complete', 'withdrawal', NEW.id,
             'Withdrawal completed (ref: ' || COALESCE(NEW.transaction_reference, '—') || ')'
        FROM public.profiles p WHERE p.id = NEW.user_id
      ON CONFLICT (kind, reference_id) WHERE reference_id IS NOT NULL DO NOTHING;
      PERFORM public.notify_user(NEW.user_id, 'Withdrawal completed ✓',
        'Your funds have been sent. Ref: ' || COALESCE(NEW.transaction_reference, '—'), '/wallet');
    ELSIF NEW.status = 'processing' THEN
      PERFORM public.notify_user(NEW.user_id, 'Withdrawal processing',
        'Your withdrawal is being processed.', '/wallet');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount numeric, _payment_method text, _account_details jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF _payment_method IS NULL OR length(trim(_payment_method)) = 0 THEN
    RAISE EXCEPTION 'Payment method required';
  END IF;

  -- Create the withdrawal request first to get its id for the ledger reference.
  INSERT INTO public.withdrawal_requests (user_id, amount, payment_method, account_details)
  VALUES (v_user, _amount, _payment_method, COALESCE(_account_details, '{}'::jsonb))
  RETURNING id INTO v_id;

  -- Atomic debit; raises if insufficient balance (rolls back the insert above).
  PERFORM public.apply_wallet_delta(
    v_user,
    -_amount,
    'withdrawal_hold',
    'withdrawal',
    v_id,
    'Hold for withdrawal request'
  );

  PERFORM public.notify_user(v_user, 'Withdrawal requested',
    _amount::text || ' MAD reserved from your wallet. Awaiting admin review.', '/wallet');
  RETURN v_id;
END;
$$;


-- =========================================
-- 4. PAYMENT PROOF IDEMPOTENCY
-- =========================================

-- Prevent multiple non-rejected proofs for the same order.
CREATE UNIQUE INDEX payment_proofs_active_per_order
  ON public.payment_proofs (order_id)
  WHERE verification_status <> 'rejected';


-- =========================================
-- 5. AUDIT LOGS (admin actions)
-- =========================================

CREATE OR REPLACE FUNCTION public.log_admin_action(
  _action text,
  _target_type text,
  _target_id uuid,
  _details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF NOT public.has_role(auth.uid(), 'admin') THEN RETURN; END IF;
  INSERT INTO public.admin_actions_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), _action, _target_type, _target_id, COALESCE(_details, '{}'::jsonb));
END;
$$;

-- Generic audit trigger functions per table
CREATE OR REPLACE FUNCTION public.audit_orders()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin')
     AND NEW.order_status IS DISTINCT FROM OLD.order_status THEN
    PERFORM public.log_admin_action(
      'order.status_change', 'order', NEW.id,
      jsonb_build_object('from', OLD.order_status, 'to', NEW.order_status));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.audit_payment_proofs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin')
     AND NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    PERFORM public.log_admin_action(
      'payment_proof.review', 'payment_proof', NEW.id,
      jsonb_build_object('order_id', NEW.order_id, 'status', NEW.verification_status,
                         'notes', NEW.admin_notes));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.audit_seller_verifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_admin_action(
      'kyc.review', 'seller_verification', NEW.id,
      jsonb_build_object('user_id', NEW.user_id, 'status', NEW.status, 'notes', NEW.admin_notes));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.audit_withdrawals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin')
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_admin_action(
      'withdrawal.review', 'withdrawal', NEW.id,
      jsonb_build_object('user_id', NEW.user_id, 'amount', NEW.amount,
                         'status', NEW.status, 'ref', NEW.transaction_reference));
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.audit_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin')
     AND NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
    PERFORM public.log_admin_action(
      CASE WHEN NEW.is_banned THEN 'user.ban' ELSE 'user.unban' END,
      'profile', NEW.id, '{}'::jsonb);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_orders ON public.orders;
CREATE TRIGGER trg_audit_orders AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_orders();

DROP TRIGGER IF EXISTS trg_audit_payment_proofs ON public.payment_proofs;
CREATE TRIGGER trg_audit_payment_proofs AFTER UPDATE ON public.payment_proofs
  FOR EACH ROW EXECUTE FUNCTION public.audit_payment_proofs();

DROP TRIGGER IF EXISTS trg_audit_seller_verifications ON public.seller_verifications;
CREATE TRIGGER trg_audit_seller_verifications AFTER UPDATE ON public.seller_verifications
  FOR EACH ROW EXECUTE FUNCTION public.audit_seller_verifications();

DROP TRIGGER IF EXISTS trg_audit_withdrawals ON public.withdrawal_requests;
CREATE TRIGGER trg_audit_withdrawals AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.audit_withdrawals();

DROP TRIGGER IF EXISTS trg_audit_profiles ON public.profiles;
CREATE TRIGGER trg_audit_profiles AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_profiles();


-- =========================================
-- 6. BACKFILL OPENING BALANCES
-- =========================================

INSERT INTO public.wallet_ledger (user_id, amount, balance_after, kind, notes)
SELECT id, wallet_balance, wallet_balance, 'opening_balance',
       'Opening balance at ledger introduction'
  FROM public.profiles
 WHERE wallet_balance <> 0
   AND NOT EXISTS (
     SELECT 1 FROM public.wallet_ledger l
      WHERE l.user_id = profiles.id AND l.kind = 'opening_balance'
   );
