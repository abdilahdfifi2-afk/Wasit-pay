
-- 1. Profiles: tighten role targeting to authenticated only
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Users view own profile"
ON public.profiles FOR SELECT
TO authenticated
USING ((auth.uid() = id) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile safe fields" ON public.profiles;
CREATE POLICY "Users update own profile safe fields"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  (auth.uid() = id)
  AND (wallet_balance = (SELECT p.wallet_balance FROM public.profiles p WHERE p.id = profiles.id))
  AND (is_banned = (SELECT p.is_banned FROM public.profiles p WHERE p.id = profiles.id))
);

DROP POLICY IF EXISTS "Admins update any profile" ON public.profiles;
CREATE POLICY "Admins update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. product-images: align bucket setting with public read policy (marketplace needs anon image access)
-- (bucket flipped to public via storage tool below — also dedupe policies)
DROP POLICY IF EXISTS "product_images_read" ON storage.objects;
DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;

-- 3. Realtime: remove permissive wildcard, restrict to user-scoped topics + admin
DROP POLICY IF EXISTS "Users subscribe to own realtime topics" ON realtime.messages;
CREATE POLICY "Users subscribe to own realtime topics"
ON realtime.messages FOR SELECT
TO authenticated
USING (
  (realtime.topic() = ('user:' || auth.uid()::text))
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 4. SECURITY DEFINER: revoke EXECUTE on internal-only functions (triggers/helpers)
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_message_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_payment_proof_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_order_completed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_withdrawal_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_seller_verification_approved() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_order_financials() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Keep callable: has_role (used in RLS — needs authenticated) and request_withdrawal (user RPC)
-- Explicitly grant to be safe:
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, jsonb) TO authenticated;
