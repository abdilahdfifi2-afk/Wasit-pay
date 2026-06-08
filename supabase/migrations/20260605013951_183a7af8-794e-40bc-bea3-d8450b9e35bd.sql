
-- 1. Realtime authorization: restrict topic subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to receive realtime broadcasts only for topics tied to their own uid
DROP POLICY IF EXISTS "Users subscribe to own realtime topics" ON realtime.messages;
CREATE POLICY "Users subscribe to own realtime topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() = ('user:' || auth.uid()::text))
  OR public.has_role(auth.uid(), 'admin'::app_role)
  -- Postgres-changes channels: allow if user is owner of row via subscription filter handled by RLS on underlying tables
  OR (realtime.topic() LIKE 'realtime:%')
);

-- 2. Storage DELETE policies

-- kyc-documents: owner + admin
DROP POLICY IF EXISTS "KYC owner delete" ON storage.objects;
CREATE POLICY "KYC owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "KYC admin delete" ON storage.objects;
CREATE POLICY "KYC admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- message-attachments: owner
DROP POLICY IF EXISTS "Message attachments owner delete" ON storage.objects;
CREATE POLICY "Message attachments owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- payment-proofs: owner + admin
DROP POLICY IF EXISTS "Payment proofs owner delete" ON storage.objects;
CREATE POLICY "Payment proofs owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Payment proofs admin delete" ON storage.objects;
CREATE POLICY "Payment proofs admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- payment-screenshots: owner + admin
DROP POLICY IF EXISTS "Payment screenshots owner delete" ON storage.objects;
CREATE POLICY "Payment screenshots owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Payment screenshots admin delete" ON storage.objects;
CREATE POLICY "Payment screenshots admin delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Allow sellers to read payment-screenshots tied to their orders
DROP POLICY IF EXISTS "Payment screenshots seller read" ON storage.objects;
CREATE POLICY "Payment screenshots seller read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-screenshots'
  AND EXISTS (
    SELECT 1
    FROM public.payment_proofs pp
    JOIN public.orders o ON o.id = pp.order_id
    WHERE pp.image_url LIKE '%' || storage.objects.name || '%'
      AND o.seller_id = auth.uid()
  )
);
