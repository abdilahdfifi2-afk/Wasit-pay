
-- Fix 1: Lock wallet_balance and is_banned on user self-updates
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile safe fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND wallet_balance = (SELECT p.wallet_balance FROM public.profiles p WHERE p.id = profiles.id)
    AND is_banned = (SELECT p.is_banned FROM public.profiles p WHERE p.id = profiles.id)
  );

-- Fix 2: Server-side enforcement of order financial fields
CREATE OR REPLACE FUNCTION public.enforce_order_financials()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_price numeric;
  v_seller uuid;
BEGIN
  SELECT price, seller_id INTO v_price, v_seller FROM public.products WHERE id = NEW.product_id;
  IF v_price IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  -- Overwrite client-supplied financial fields with trusted server values
  NEW.amount := v_price;
  NEW.commission := round(v_price * 0.05, 2);
  NEW.seller_id := v_seller;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_order_financials() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_order_financials ON public.orders;
CREATE TRIGGER trg_enforce_order_financials
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_financials();
