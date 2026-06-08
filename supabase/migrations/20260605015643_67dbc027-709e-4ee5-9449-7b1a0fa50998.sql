DROP POLICY IF EXISTS "Sellers insert own products" ON public.products;

CREATE POLICY "Sellers insert own products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seller_id
  AND public.has_role(auth.uid(), 'seller'::app_role)
);