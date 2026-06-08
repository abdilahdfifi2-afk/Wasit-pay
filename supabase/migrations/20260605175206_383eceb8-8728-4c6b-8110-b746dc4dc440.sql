
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_orders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_payment_proofs() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_seller_verifications() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_withdrawals() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_profiles() FROM PUBLIC, anon, authenticated;
