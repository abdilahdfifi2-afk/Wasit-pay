
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text) TO service_role;
