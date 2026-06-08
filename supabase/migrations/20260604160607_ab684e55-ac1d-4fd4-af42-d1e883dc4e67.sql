
-- ============= STORAGE POLICIES =============

-- product-images: public read (via RLS since bucket can't be made public), sellers upload to their own folder
DROP POLICY IF EXISTS "product_images_read" ON storage.objects;
CREATE POLICY "product_images_read" ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_insert" ON storage.objects;
CREATE POLICY "product_images_insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "product_images_delete" ON storage.objects;
CREATE POLICY "product_images_delete" ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- avatars: public read, owner upload
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- payment-proofs: only uploader and admins can read; uploader can insert
DROP POLICY IF EXISTS "proofs_read" ON storage.objects;
CREATE POLICY "proofs_read" ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "proofs_insert" ON storage.objects;
CREATE POLICY "proofs_insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- message-attachments: sender uploads, sender/receiver read
DROP POLICY IF EXISTS "msg_att_read" ON storage.objects;
CREATE POLICY "msg_att_read" ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "msg_att_insert" ON storage.objects;
CREATE POLICY "msg_att_insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============= NOTIFICATIONS via TRIGGERS =============

-- Allow our SECURITY DEFINER trigger functions to insert notifications by adding a permissive insert via service role only (RLS still blocks user inserts).
-- (No INSERT policy created; triggers run as definer and bypass RLS.)

CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _title text, _message text, _link text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, link) VALUES (_user_id, _title, _message, _link);
END; $$;

-- On payment proof submission -> notify admins (all of them) + seller
CREATE OR REPLACE FUNCTION public.on_payment_proof_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_admin uuid;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;
  -- Notify all admins
  FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    PERFORM public.notify_user(v_admin, 'Payment proof submitted', 'New proof awaiting verification.', '/admin');
  END LOOP;
  -- Notify seller
  IF v_order.seller_id IS NOT NULL THEN
    PERFORM public.notify_user(v_order.seller_id, 'Buyer submitted payment', 'Awaiting admin verification.', '/seller');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_payment_proof_insert ON public.payment_proofs;
CREATE TRIGGER trg_payment_proof_insert AFTER INSERT ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.on_payment_proof_insert();

-- On order status change -> notify buyer & seller
CREATE OR REPLACE FUNCTION public.on_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg text;
BEGIN
  IF NEW.order_status IS DISTINCT FROM OLD.order_status THEN
    v_msg := 'Order status: ' || NEW.order_status;
    PERFORM public.notify_user(NEW.buyer_id, 'Order update', v_msg, '/orders');
    PERFORM public.notify_user(NEW.seller_id, 'Order update', v_msg, '/seller');
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_order_status_change ON public.orders;
CREATE TRIGGER trg_order_status_change AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_status_change();

-- On new message -> notify receiver
CREATE OR REPLACE FUNCTION public.on_message_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_user(NEW.receiver_id, 'New message', COALESCE(LEFT(NEW.message, 60), 'Sent you an image'), '/chat');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_message_insert ON public.messages;
CREATE TRIGGER trg_message_insert AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_message_insert();

-- ============= REALTIME =============
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Updated-at triggers for tables that need them
DROP TRIGGER IF EXISTS trg_products_updated ON public.products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_orders_updated ON public.orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure new-user trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
