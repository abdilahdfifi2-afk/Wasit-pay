
-- 1. Messages: tighten sender update policy to lock immutable fields
DROP POLICY IF EXISTS "Senders update own messages" ON public.messages;
CREATE POLICY "Senders update own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (
  auth.uid() = sender_id
  AND sender_id   = (SELECT m.sender_id   FROM public.messages m WHERE m.id = messages.id)
  AND receiver_id = (SELECT m.receiver_id FROM public.messages m WHERE m.id = messages.id)
  AND NOT (order_id IS DISTINCT FROM (SELECT m.order_id FROM public.messages m WHERE m.id = messages.id))
  AND created_at  = (SELECT m.created_at  FROM public.messages m WHERE m.id = messages.id)
  AND is_read     = (SELECT m.is_read     FROM public.messages m WHERE m.id = messages.id)
);

-- 2. Affiliate clicks: hide ip_hash / user_agent from affiliates; admins keep full access via separate policy
DROP POLICY IF EXISTS "Affiliate views own clicks" ON public.affiliate_clicks;

CREATE POLICY "Admins view all clicks"
ON public.affiliate_clicks
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.affiliate_clicks_safe
WITH (security_invoker = true)
AS
SELECT id, code, referer, created_at
FROM public.affiliate_clicks
WHERE EXISTS (
  SELECT 1 FROM public.affiliate_codes c
  WHERE c.code = affiliate_clicks.code AND c.user_id = auth.uid()
);

GRANT SELECT ON public.affiliate_clicks_safe TO authenticated;

-- 3. Notifications: allow users to delete their own
CREATE POLICY "Users delete own notifications"
ON public.notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Reviews: clean legacy null-order rows and enforce NOT NULL
DELETE FROM public.reviews WHERE order_id IS NULL;
ALTER TABLE public.reviews ALTER COLUMN order_id SET NOT NULL;
