
-- 1) Payment proofs storage: restrict reads to order participants + admin
DROP POLICY IF EXISTS "proofs_read" ON storage.objects;
DROP POLICY IF EXISTS "Users read own payment proofs" ON storage.objects;

CREATE POLICY "Payment proofs read by order participants"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.payment_proofs pp
      JOIN public.orders o ON o.id = pp.order_id
      WHERE pp.image_url = storage.objects.name
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  )
);

-- 2) Orders: restrict participant updates to safe columns only
DROP POLICY IF EXISTS "Participants update orders" ON public.orders;

CREATE POLICY "Admins update any order field"
ON public.orders FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Buyer: may only update shipping_address; cannot mutate status/financial fields
CREATE POLICY "Buyers update own shipping address"
ON public.orders FOR UPDATE
USING (auth.uid() = buyer_id)
WITH CHECK (
  auth.uid() = buyer_id
  AND order_status = (SELECT order_status FROM public.orders WHERE id = orders.id)
  AND amount       = (SELECT amount       FROM public.orders WHERE id = orders.id)
  AND commission   = (SELECT commission   FROM public.orders WHERE id = orders.id)
  AND payment_method IS NOT DISTINCT FROM (SELECT payment_method FROM public.orders WHERE id = orders.id)
  AND shipping_status IS NOT DISTINCT FROM (SELECT shipping_status FROM public.orders WHERE id = orders.id)
  AND tracking_number IS NOT DISTINCT FROM (SELECT tracking_number FROM public.orders WHERE id = orders.id)
  AND seller_id  = (SELECT seller_id  FROM public.orders WHERE id = orders.id)
  AND buyer_id   = (SELECT buyer_id   FROM public.orders WHERE id = orders.id)
  AND product_id = (SELECT product_id FROM public.orders WHERE id = orders.id)
);

-- Seller: may only update shipping_status & tracking_number when paid/shipped
CREATE POLICY "Sellers update shipping info"
ON public.orders FOR UPDATE
USING (auth.uid() = seller_id)
WITH CHECK (
  auth.uid() = seller_id
  AND order_status IN (
    (SELECT order_status FROM public.orders WHERE id = orders.id),
    'shipped'::order_status
  )
  AND amount     = (SELECT amount     FROM public.orders WHERE id = orders.id)
  AND commission = (SELECT commission FROM public.orders WHERE id = orders.id)
  AND payment_method IS NOT DISTINCT FROM (SELECT payment_method FROM public.orders WHERE id = orders.id)
  AND shipping_address IS NOT DISTINCT FROM (SELECT shipping_address FROM public.orders WHERE id = orders.id)
  AND seller_id  = (SELECT seller_id  FROM public.orders WHERE id = orders.id)
  AND buyer_id   = (SELECT buyer_id   FROM public.orders WHERE id = orders.id)
  AND product_id = (SELECT product_id FROM public.orders WHERE id = orders.id)
);

-- Buyer: confirm delivery -> completed (allow only this status transition)
CREATE POLICY "Buyers confirm delivery"
ON public.orders FOR UPDATE
USING (
  auth.uid() = buyer_id
  AND order_status IN ('shipped'::order_status, 'delivered'::order_status)
)
WITH CHECK (
  auth.uid() = buyer_id
  AND order_status = 'completed'::order_status
  AND amount     = (SELECT amount     FROM public.orders WHERE id = orders.id)
  AND commission = (SELECT commission FROM public.orders WHERE id = orders.id)
  AND seller_id  = (SELECT seller_id  FROM public.orders WHERE id = orders.id)
  AND buyer_id   = (SELECT buyer_id   FROM public.orders WHERE id = orders.id)
  AND product_id = (SELECT product_id FROM public.orders WHERE id = orders.id)
);

-- 3) Disputes: require opener to be a participant of the referenced order
DROP POLICY IF EXISTS "Users open disputes" ON public.disputes;

CREATE POLICY "Participants open disputes"
ON public.disputes FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = opened_by
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = disputes.order_id
      AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
  )
);

-- 4) Payment proofs insert: require uploader to be the buyer of the order
DROP POLICY IF EXISTS "Users upload own proofs" ON public.payment_proofs;

CREATE POLICY "Buyers upload proofs for own orders"
ON public.payment_proofs FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = uploaded_by
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = payment_proofs.order_id
      AND o.buyer_id = auth.uid()
  )
);

-- 5) Reviews: enforce one review per (order_id, reviewer_id)
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_unique_order_reviewer UNIQUE (order_id, reviewer_id);
