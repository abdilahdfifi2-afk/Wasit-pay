
-- Add edited/deleted tracking columns
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Allow senders to update their own messages (edit / soft-delete)
DROP POLICY IF EXISTS "Senders update own messages" ON public.messages;
CREATE POLICY "Senders update own messages"
ON public.messages
FOR UPDATE
TO authenticated
USING (auth.uid() = sender_id)
WITH CHECK (auth.uid() = sender_id);

-- Allow senders to hard-delete their own messages
DROP POLICY IF EXISTS "Senders delete own messages" ON public.messages;
CREATE POLICY "Senders delete own messages"
ON public.messages
FOR DELETE
TO authenticated
USING (auth.uid() = sender_id);

-- Storage policies for message-attachments bucket
-- Path convention: <user_id>/<filename>
DROP POLICY IF EXISTS "Users upload own chat attachments" ON storage.objects;
CREATE POLICY "Users upload own chat attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Authenticated view chat attachments" ON storage.objects;
CREATE POLICY "Authenticated view chat attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'message-attachments');

DROP POLICY IF EXISTS "Users delete own chat attachments" ON storage.objects;
CREATE POLICY "Users delete own chat attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
