DROP POLICY IF EXISTS "Users update own pending verification" ON public.seller_verifications;

CREATE POLICY "Users update own pending or rejected verification"
ON public.seller_verifications
FOR UPDATE
USING (
  auth.uid() = user_id
  AND status IN ('pending'::kyc_status, 'rejected'::kyc_status)
)
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'::kyc_status
  AND reviewed_by IS NULL
  AND reviewed_at IS NULL
);