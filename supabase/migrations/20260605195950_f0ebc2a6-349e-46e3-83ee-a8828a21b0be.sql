-- Fix 1: Restrict 'Receivers mark read' to only toggle is_read
DROP POLICY IF EXISTS "Receivers mark read" ON public.messages;
CREATE POLICY "Receivers mark read"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (
  auth.uid() = receiver_id
  AND sender_id    = (SELECT m.sender_id    FROM public.messages m WHERE m.id = messages.id)
  AND receiver_id  = (SELECT m.receiver_id  FROM public.messages m WHERE m.id = messages.id)
  AND order_id IS NOT DISTINCT FROM (SELECT m.order_id    FROM public.messages m WHERE m.id = messages.id)
  AND message    IS NOT DISTINCT FROM (SELECT m.message     FROM public.messages m WHERE m.id = messages.id)
  AND image_url  IS NOT DISTINCT FROM (SELECT m.image_url   FROM public.messages m WHERE m.id = messages.id)
  AND edited_at  IS NOT DISTINCT FROM (SELECT m.edited_at   FROM public.messages m WHERE m.id = messages.id)
  AND deleted_at IS NOT DISTINCT FROM (SELECT m.deleted_at  FROM public.messages m WHERE m.id = messages.id)
  AND created_at = (SELECT m.created_at FROM public.messages m WHERE m.id = messages.id)
);

-- Fix 2: Validate affiliate_clicks.code references a real affiliate code
DROP POLICY IF EXISTS "Anyone log click" ON public.affiliate_clicks;
CREATE POLICY "Anyone log click"
ON public.affiliate_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.affiliate_codes c WHERE c.code = affiliate_clicks.code));
