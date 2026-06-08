CREATE OR REPLACE FUNCTION public.on_order_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_status = 'completed' AND OLD.order_status IS DISTINCT FROM 'completed' THEN
    UPDATE public.profiles
       SET wallet_balance = wallet_balance + (NEW.amount - NEW.commission)
     WHERE id = NEW.seller_id;
    PERFORM public.notify_user(
      NEW.seller_id,
      'Escrow released',
      'Funds for order #' || substr(NEW.id::text, 1, 8) || ' added to your wallet.',
      '/wallet'
    );
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_order_completed ON public.orders;
CREATE TRIGGER trg_order_completed
AFTER UPDATE OF order_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_completed();

DROP TRIGGER IF EXISTS trg_message_insert ON public.messages;
CREATE TRIGGER trg_message_insert AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_message_insert();

DROP TRIGGER IF EXISTS trg_payment_proof_insert ON public.payment_proofs;
CREATE TRIGGER trg_payment_proof_insert AFTER INSERT ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.on_payment_proof_insert();

DROP TRIGGER IF EXISTS trg_order_status_change ON public.orders;
CREATE TRIGGER trg_order_status_change AFTER UPDATE OF order_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.on_order_status_change();

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;