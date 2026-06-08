ALTER TABLE public.payment_proofs ADD COLUMN IF NOT EXISTS payment_method text;

CREATE OR REPLACE FUNCTION public.on_payment_proof_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_admin uuid;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;

  -- Auto-advance order + record payment method (RLS blocks buyer from doing this directly)
  IF v_order.order_status = 'pending_payment' THEN
    UPDATE public.orders
       SET order_status = 'payment_review',
           payment_method = COALESCE(NEW.payment_method, payment_method)
     WHERE id = NEW.order_id;
  END IF;

  -- Notify all admins
  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    PERFORM public.notify_user(v_admin, 'Payment proof submitted', 'New proof awaiting verification.', '/admin');
  END LOOP;
  IF v_order.seller_id IS NOT NULL THEN
    PERFORM public.notify_user(v_order.seller_id, 'Buyer submitted payment', 'Awaiting admin verification.', '/seller');
  END IF;
  RETURN NEW;
END;
$function$;