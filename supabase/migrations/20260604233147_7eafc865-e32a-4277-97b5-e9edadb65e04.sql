REVOKE EXECUTE ON FUNCTION public.on_order_completed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_message_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_payment_proof_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) FROM PUBLIC, anon, authenticated;