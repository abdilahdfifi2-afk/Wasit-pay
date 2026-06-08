
-- ============= ENUMS =============
CREATE TYPE public.kyc_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'processing', 'completed', 'rejected');

-- ============= SELLER_VERIFICATIONS =============
CREATE TABLE public.seller_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  id_card_number text NOT NULL,
  id_card_front_url text NOT NULL,
  id_card_back_url text NOT NULL,
  selfie_url text NOT NULL,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.seller_verifications TO authenticated;
GRANT ALL ON public.seller_verifications TO service_role;
ALTER TABLE public.seller_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verification"
  ON public.seller_verifications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users submit own verification"
  ON public.seller_verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending verification"
  ON public.seller_verifications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );

CREATE POLICY "Admins review verifications"
  ON public.seller_verifications FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_seller_verifications_updated
  BEFORE UPDATE ON public.seller_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-grant seller role on approval + notify
CREATE OR REPLACE FUNCTION public.on_seller_verification_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'seller')
    ON CONFLICT (user_id, role) DO NOTHING;
    PERFORM public.notify_user(NEW.user_id, 'Verification approved ✓', 'You can now list products on AmanPay.', '/seller');
  ELSIF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    PERFORM public.notify_user(NEW.user_id, 'Verification rejected', COALESCE(NEW.admin_notes, 'Please review the requirements and resubmit.'), '/seller/verify');
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.on_seller_verification_approved() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_seller_verification_status
  AFTER UPDATE ON public.seller_verifications
  FOR EACH ROW EXECUTE FUNCTION public.on_seller_verification_approved();

-- ============= WITHDRAWAL_REQUESTS =============
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL,
  account_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  admin_notes text,
  transaction_reference text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals"
  ON public.withdrawal_requests FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Users insert only via RPC (RPC bypasses by using SECURITY DEFINER)
CREATE POLICY "Admins update withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_withdrawal_updated
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic withdrawal request: debits wallet, creates request
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _amount numeric,
  _payment_method text,
  _account_details jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_balance numeric;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  IF _payment_method IS NULL OR length(trim(_payment_method)) = 0 THEN
    RAISE EXCEPTION 'Payment method required';
  END IF;

  SELECT wallet_balance INTO v_balance FROM public.profiles WHERE id = v_user FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  IF v_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE public.profiles SET wallet_balance = wallet_balance - _amount WHERE id = v_user;

  INSERT INTO public.withdrawal_requests (user_id, amount, payment_method, account_details)
  VALUES (v_user, _amount, _payment_method, COALESCE(_account_details, '{}'::jsonb))
  RETURNING id INTO v_id;

  PERFORM public.notify_user(v_user, 'Withdrawal requested', _amount::text || ' MAD reserved from your wallet. Awaiting admin review.', '/wallet');
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, jsonb) TO authenticated;

-- On status change: refund on reject, notify on every change
CREATE OR REPLACE FUNCTION public.on_withdrawal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'rejected' AND OLD.status <> 'rejected' THEN
      UPDATE public.profiles SET wallet_balance = wallet_balance + NEW.amount WHERE id = NEW.user_id;
      PERFORM public.notify_user(NEW.user_id, 'Withdrawal rejected', COALESCE(NEW.admin_notes, 'Funds returned to your wallet.'), '/wallet');
    ELSIF NEW.status = 'completed' THEN
      PERFORM public.notify_user(NEW.user_id, 'Withdrawal completed ✓', 'Your funds have been sent. Ref: ' || COALESCE(NEW.transaction_reference, '—'), '/wallet');
    ELSIF NEW.status = 'processing' THEN
      PERFORM public.notify_user(NEW.user_id, 'Withdrawal processing', 'Your withdrawal is being processed.', '/wallet');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.on_withdrawal_status_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_withdrawal_status
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.on_withdrawal_status_change();

-- ============= STORAGE POLICIES: payment-screenshots =============
CREATE POLICY "Order participants view payment screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-screenshots'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Buyers upload own payment screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Buyers update own payment screenshots"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'payment-screenshots'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============= STORAGE POLICIES: kyc-documents (very restricted) =============
CREATE POLICY "Users view own kyc"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Users upload own kyc"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users replace own pending kyc"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
