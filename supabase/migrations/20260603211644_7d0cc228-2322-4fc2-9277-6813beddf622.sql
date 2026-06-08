
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('buyer','seller','admin');
CREATE TYPE public.order_status AS ENUM ('pending_payment','payment_review','paid','processing','shipped','delivered','completed','cancelled','disputed');
CREATE TYPE public.product_status AS ENUM ('active','sold','draft','removed');
CREATE TYPE public.verification_status AS ENUM ('pending','approved','rejected');
CREATE TYPE public.dispute_status AS ENUM ('open','reviewing','resolved','rejected');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  wallet_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES (separate table, security definer function)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'new',
  images TEXT[] NOT NULL DEFAULT '{}',
  status public.product_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products ON DELETE RESTRICT,
  amount NUMERIC(12,2) NOT NULL,
  commission NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT,
  order_status public.order_status NOT NULL DEFAULT 'pending_payment',
  shipping_status TEXT DEFAULT 'not_shipped',
  shipping_address TEXT,
  tracking_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- PAYMENT PROOFS
CREATE TABLE public.payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  transaction_reference TEXT,
  verification_status public.verification_status NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payment_proofs TO authenticated;
GRANT ALL ON public.payment_proofs TO service_role;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders ON DELETE CASCADE,
  message TEXT,
  image_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reviewed_user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- DISPUTES
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders ON DELETE CASCADE,
  opened_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status public.dispute_status NOT NULL DEFAULT 'open',
  admin_resolution TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.disputes TO authenticated;
GRANT ALL ON public.disputes TO service_role;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- FAVORITES
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins update any profile" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- products
CREATE POLICY "Active products viewable by everyone" ON public.products FOR SELECT USING (status = 'active' OR seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Sellers insert own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers update own products" ON public.products FOR UPDATE USING (auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Sellers delete own products" ON public.products FOR DELETE USING (auth.uid() = seller_id OR public.has_role(auth.uid(),'admin'));

-- orders
CREATE POLICY "Participants view their orders" ON public.orders FOR SELECT USING (auth.uid() IN (buyer_id, seller_id) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Buyers create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants update orders" ON public.orders FOR UPDATE USING (auth.uid() IN (buyer_id, seller_id) OR public.has_role(auth.uid(),'admin'));

-- payment_proofs
CREATE POLICY "Order participants view proofs" ON public.payment_proofs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (auth.uid() IN (o.buyer_id, o.seller_id))) OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Users upload own proofs" ON public.payment_proofs FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Admins update proofs" ON public.payment_proofs FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- messages
CREATE POLICY "Participants view messages" ON public.messages FOR SELECT USING (auth.uid() IN (sender_id, receiver_id));
CREATE POLICY "Senders insert messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receivers mark read" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

-- notifications
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- reviews
CREATE POLICY "Reviews viewable by everyone" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- disputes
CREATE POLICY "Order participants view disputes" ON public.disputes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND auth.uid() IN (o.buyer_id, o.seller_id)) OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Users open disputes" ON public.disputes FOR INSERT WITH CHECK (auth.uid() = opened_by);
CREATE POLICY "Admins update disputes" ON public.disputes FOR UPDATE USING (public.has_role(auth.uid(),'admin'));

-- favorites
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AUTO PROFILE + BUYER ROLE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), COALESCE(NEW.raw_user_meta_data->>'phone',''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'buyer');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
