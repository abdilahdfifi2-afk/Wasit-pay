INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT p.seller_id, 'seller'::public.app_role
FROM public.products p
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT sv.user_id, 'seller'::public.app_role
FROM public.seller_verifications sv
WHERE sv.status = 'approved'
ON CONFLICT (user_id, role) DO NOTHING;

DROP POLICY IF EXISTS "Sellers update own products" ON public.products;
CREATE POLICY "Sellers update own products"
ON public.products
FOR UPDATE
TO authenticated
USING (
  auth.uid() = seller_id
  AND public.has_role(auth.uid(), 'seller'::public.app_role)
)
WITH CHECK (
  auth.uid() = seller_id
  AND public.has_role(auth.uid(), 'seller'::public.app_role)
);

DROP POLICY IF EXISTS "Sellers delete own products" ON public.products;
CREATE POLICY "Sellers delete own products"
ON public.products
FOR DELETE
TO authenticated
USING (
  auth.uid() = seller_id
  AND public.has_role(auth.uid(), 'seller'::public.app_role)
);

DROP POLICY IF EXISTS "Admins manage products" ON public.products;
CREATE POLICY "Admins manage products"
ON public.products
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));