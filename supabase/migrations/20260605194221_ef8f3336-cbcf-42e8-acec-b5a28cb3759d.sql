-- 1. Remove the overly-broad SELECT policy on message attachments
DROP POLICY IF EXISTS "Authenticated view chat attachments" ON storage.objects;

-- 2. Explicit deny-INSERT on withdrawal_requests (RPC uses SECURITY DEFINER, bypasses RLS)
CREATE POLICY "Block direct withdrawal inserts"
  ON public.withdrawal_requests
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (false);
