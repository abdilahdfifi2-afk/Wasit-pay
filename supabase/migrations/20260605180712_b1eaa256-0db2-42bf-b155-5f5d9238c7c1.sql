
-- 1. Atomic payment-proof review (admin)
CREATE OR REPLACE FUNCTION public.review_payment_proof(
  _proof_id uuid,
  _decision verification_status,
  _notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proof public.payment_proofs%ROWTYPE;
  v_new_order_status order_status;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF _decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'Invalid decision: %', _decision;
  END IF;

  SELECT * INTO v_proof FROM public.payment_proofs WHERE id = _proof_id FOR UPDATE;
  IF v_proof.id IS NULL THEN
    RAISE EXCEPTION 'Payment proof not found';
  END IF;
  IF v_proof.verification_status <> 'pending' THEN
    RAISE EXCEPTION 'Payment proof already %', v_proof.verification_status;
  END IF;

  UPDATE public.payment_proofs
     SET verification_status = _decision,
         admin_notes = COALESCE(_notes, admin_notes)
   WHERE id = _proof_id;

  v_new_order_status := CASE WHEN _decision = 'approved' THEN 'paid'::order_status
                              ELSE 'cancelled'::order_status END;

  UPDATE public.orders
     SET order_status = v_new_order_status
   WHERE id = v_proof.order_id
     AND order_status IN ('payment_review','pending_payment');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_payment_proof(uuid, verification_status, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.review_payment_proof(uuid, verification_status, text) TO authenticated;

-- 2. Atomic dispute resolution that actually moves money
CREATE OR REPLACE FUNCTION public.resolve_dispute(
  _dispute_id uuid,
  _winner text,              -- 'buyer' or 'seller'
  _resolution text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dispute public.disputes%ROWTYPE;
  v_order public.orders%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;
  IF _winner NOT IN ('buyer','seller') THEN
    RAISE EXCEPTION 'Invalid winner: %', _winner;
  END IF;

  SELECT * INTO v_dispute FROM public.disputes WHERE id = _dispute_id FOR UPDATE;
  IF v_dispute.id IS NULL THEN RAISE EXCEPTION 'Dispute not found'; END IF;
  IF v_dispute.status <> 'open' THEN RAISE EXCEPTION 'Dispute already %', v_dispute.status; END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = v_dispute.order_id FOR UPDATE;

  IF _winner = 'buyer' THEN
    -- Refund buyer = cancel the order, no escrow release.
    UPDATE public.orders SET order_status = 'cancelled' WHERE id = v_order.id;
    PERFORM public.notify_user(v_order.buyer_id, 'Dispute resolved ✓',
      'Resolved in your favor. Order cancelled.', '/orders');
    PERFORM public.notify_user(v_order.seller_id, 'Dispute resolved',
      'Resolved in buyer favor. No funds released.', '/seller');
  ELSE
    -- Release to seller = complete the order; on_order_completed credits wallet via ledger.
    UPDATE public.orders SET order_status = 'completed' WHERE id = v_order.id;
    PERFORM public.notify_user(v_order.seller_id, 'Dispute resolved ✓',
      'Resolved in your favor. Funds released to your wallet.', '/wallet');
    PERFORM public.notify_user(v_order.buyer_id, 'Dispute resolved',
      'Resolved in seller favor.', '/orders');
  END IF;

  UPDATE public.disputes
     SET status = 'resolved',
         admin_resolution = COALESCE(_resolution, 'Resolved in favor of ' || _winner)
   WHERE id = _dispute_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text) TO authenticated;

-- 3. Allow buyer to cancel their own order while still pending payment
CREATE POLICY "Buyers cancel pending orders"
ON public.orders FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id AND order_status IN ('pending_payment','payment_review'))
WITH CHECK (
  auth.uid() = buyer_id
  AND order_status = 'cancelled'
  AND amount = (SELECT o.amount FROM orders o WHERE o.id = orders.id)
  AND commission = (SELECT o.commission FROM orders o WHERE o.id = orders.id)
  AND seller_id = (SELECT o.seller_id FROM orders o WHERE o.id = orders.id)
  AND buyer_id = (SELECT o.buyer_id FROM orders o WHERE o.id = orders.id)
  AND product_id = (SELECT o.product_id FROM orders o WHERE o.id = orders.id)
);

-- 4. Allow buyer to mark shipped order as delivered (intermediate step before completion)
--    (existing "Buyers confirm delivery" covers shipped → completed; this lets buyer
--     also flag the intermediate "delivered" status.)
CREATE POLICY "Buyers mark delivered"
ON public.orders FOR UPDATE
TO authenticated
USING (auth.uid() = buyer_id AND order_status = 'shipped')
WITH CHECK (
  auth.uid() = buyer_id
  AND order_status = 'delivered'
  AND amount = (SELECT o.amount FROM orders o WHERE o.id = orders.id)
  AND commission = (SELECT o.commission FROM orders o WHERE o.id = orders.id)
  AND seller_id = (SELECT o.seller_id FROM orders o WHERE o.id = orders.id)
  AND buyer_id = (SELECT o.buyer_id FROM orders o WHERE o.id = orders.id)
  AND product_id = (SELECT o.product_id FROM orders o WHERE o.id = orders.id)
);
