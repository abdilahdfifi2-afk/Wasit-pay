
-- 1) Profiles SELECT restriction + safe public view
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT id, full_name, avatar_url, is_banned, created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 2) Message-attachments storage scoped to message participants
DROP POLICY IF EXISTS "msg_att_read" ON storage.objects;
DROP POLICY IF EXISTS "Users read message attachments" ON storage.objects;

CREATE POLICY "Message participants read attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.image_url = storage.objects.name
        AND (auth.uid() = m.sender_id OR auth.uid() = m.receiver_id)
    )
  );

-- 3) Reviews: order participant only, no self-review, one per (order, reviewer)
DROP POLICY IF EXISTS "Users create reviews" ON public.reviews;

CREATE POLICY "Order participants create reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id
    AND reviewer_id <> reviewed_user_id
    AND order_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = reviews.order_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
        AND (o.buyer_id = reviewed_user_id OR o.seller_id = reviewed_user_id)
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_per_order_reviewer
  ON public.reviews (order_id, reviewer_id);

-- 4) user_roles writes restricted to admins
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM anon, authenticated;

CREATE POLICY "Only admins insert roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins delete roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
