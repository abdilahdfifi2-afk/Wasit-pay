-- Fix self-referential subqueries in orders RLS policies
DROP POLICY IF EXISTS "Buyers update own shipping address" ON public.orders;
DROP POLICY IF EXISTS "Sellers update shipping info" ON public.orders;
DROP POLICY IF EXISTS "Buyers confirm delivery" ON public.orders;

CREATE POLICY "Buyers update own shipping address" ON public.orders
FOR UPDATE
USING (auth.uid() = buyer_id)
WITH CHECK (
  auth.uid() = buyer_id
  AND order_status = (SELECT o.order_status FROM public.orders o WHERE o.id = orders.id)
  AND amount = (SELECT o.amount FROM public.orders o WHERE o.id = orders.id)
  AND commission = (SELECT o.commission FROM public.orders o WHERE o.id = orders.id)
  AND NOT (payment_method IS DISTINCT FROM (SELECT o.payment_method FROM public.orders o WHERE o.id = orders.id))
  AND NOT (shipping_status IS DISTINCT FROM (SELECT o.shipping_status FROM public.orders o WHERE o.id = orders.id))
  AND NOT (tracking_number IS DISTINCT FROM (SELECT o.tracking_number FROM public.orders o WHERE o.id = orders.id))
  AND seller_id = (SELECT o.seller_id FROM public.orders o WHERE o.id = orders.id)
  AND buyer_id = (SELECT o.buyer_id FROM public.orders o WHERE o.id = orders.id)
  AND product_id = (SELECT o.product_id FROM public.orders o WHERE o.id = orders.id)
);

CREATE POLICY "Sellers update shipping info" ON public.orders
FOR UPDATE
USING (auth.uid() = seller_id)
WITH CHECK (
  auth.uid() = seller_id
  AND order_status = ANY (ARRAY[(SELECT o.order_status FROM public.orders o WHERE o.id = orders.id), 'shipped'::order_status])
  AND amount = (SELECT o.amount FROM public.orders o WHERE o.id = orders.id)
  AND commission = (SELECT o.commission FROM public.orders o WHERE o.id = orders.id)
  AND NOT (payment_method IS DISTINCT FROM (SELECT o.payment_method FROM public.orders o WHERE o.id = orders.id))
  AND NOT (shipping_address IS DISTINCT FROM (SELECT o.shipping_address FROM public.orders o WHERE o.id = orders.id))
  AND seller_id = (SELECT o.seller_id FROM public.orders o WHERE o.id = orders.id)
  AND buyer_id = (SELECT o.buyer_id FROM public.orders o WHERE o.id = orders.id)
  AND product_id = (SELECT o.product_id FROM public.orders o WHERE o.id = orders.id)
);

CREATE POLICY "Buyers confirm delivery" ON public.orders
FOR UPDATE
USING (
  auth.uid() = buyer_id
  AND order_status = ANY (ARRAY['shipped'::order_status, 'delivered'::order_status])
)
WITH CHECK (
  auth.uid() = buyer_id
  AND order_status = 'completed'::order_status
  AND amount = (SELECT o.amount FROM public.orders o WHERE o.id = orders.id)
  AND commission = (SELECT o.commission FROM public.orders o WHERE o.id = orders.id)
  AND seller_id = (SELECT o.seller_id FROM public.orders o WHERE o.id = orders.id)
  AND buyer_id = (SELECT o.buyer_id FROM public.orders o WHERE o.id = orders.id)
  AND product_id = (SELECT o.product_id FROM public.orders o WHERE o.id = orders.id)
);

-- Lock down SECURITY DEFINER helper functions intended only for triggers
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_payment_proof_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_message_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_order_completed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;