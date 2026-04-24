
-- ============ Enums ============
CREATE TYPE public.app_role AS ENUM ('admin', 'finance', 'investor');
CREATE TYPE public.kyc_status AS ENUM ('pending', 'approved', 'rejected', 'not_submitted');
CREATE TYPE public.tx_type AS ENUM ('deposit', 'share_issuance', 'referral_bonus', 'dividend', 'adjustment');
CREATE TYPE public.tx_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
CREATE TYPE public.subscription_status AS ENUM ('pending', 'active', 'rejected', 'cancelled');

-- ============ Investor ID generator (6 chars, uppercase alnum, no ambiguous chars) ============
CREATE OR REPLACE FUNCTION public.generate_investor_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT;
  i INT;
  exists_check INT;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
    END LOOP;
    SELECT count(*) INTO exists_check FROM public.profiles WHERE investor_id = result;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN result;
END;
$$;

-- ============ Profiles ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_id TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  kyc_status public.kyc_status NOT NULL DEFAULT 'not_submitted',
  referred_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referral_points INT NOT NULL DEFAULT 0,
  contract_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============ User Roles ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- ============ App config (share price, referral bonus, etc.) ============
CREATE TABLE public.app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_config (key, value) VALUES
  ('share_price_kes', '500'::jsonb),
  ('total_shares_authorised', '1000000'::jsonb),
  ('referral_points_referrer', '50'::jsonb),
  ('referral_points_referred', '25'::jsonb),
  ('company_name', '"Sterling Capital Holdings"'::jsonb);

-- ============ Packages ============
CREATE TABLE public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tagline TEXT,
  min_shares INT NOT NULL,
  price_per_share_kes NUMERIC(12,2) NOT NULL,
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

INSERT INTO public.packages (name, tagline, min_shares, price_per_share_kes, benefits, is_featured, sort_order) VALUES
  ('Starter', 'Begin your investment journey', 3, 500, '["Shareholder certificate","Quarterly reports","Voting rights"]'::jsonb, false, 1),
  ('Growth', 'Build meaningful equity', 20, 500, '["All Starter benefits","Priority dividend payouts","Annual general meeting access"]'::jsonb, true, 2),
  ('Premier', 'Strategic investor tier', 100, 500, '["All Growth benefits","Direct line to leadership","Early access to new opportunities","Bonus referral multiplier"]'::jsonb, false, 3);

-- ============ Subscriptions (share purchases) ============
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  shares INT NOT NULL CHECK (shares > 0),
  price_per_share_kes NUMERIC(12,2) NOT NULL,
  total_amount_kes NUMERIC(14,2) NOT NULL,
  status public.subscription_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ============ Transactions ============
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.tx_type NOT NULL,
  status public.tx_status NOT NULL DEFAULT 'pending',
  amount_kes NUMERIC(14,2) NOT NULL DEFAULT 0,
  shares INT NOT NULL DEFAULT 0,
  reference TEXT,
  description TEXT,
  related_subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_tx_user ON public.transactions(user_id);
CREATE INDEX idx_tx_status ON public.transactions(status);

-- ============ KYC Submissions ============
CREATE TABLE public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_number TEXT,
  document_url TEXT NOT NULL,
  selfie_url TEXT,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

-- ============ Referrals ============
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_awarded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referred_id)
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- ============ Messages (chat) ============
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'public',
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_msg_channel ON public.messages(channel, created_at DESC);
CREATE INDEX idx_msg_dm ON public.messages(sender_id, recipient_id, created_at DESC);

-- ============ Interest registrations (public) ============
CREATE TABLE public.interest_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.interest_registrations ENABLE ROW LEVEL SECURITY;

-- ============ Audit log ============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============ Trigger: create profile + role + handle referral on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_iid TEXT;
  uname TEXT;
  ref_code TEXT;
  ref_user_id UUID;
  ref_pts_referrer INT;
  ref_pts_referred INT;
BEGIN
  new_iid := public.generate_investor_id();
  uname := COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8));

  -- ensure username uniqueness
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = uname) LOOP
    uname := uname || floor(random()*1000)::text;
  END LOOP;

  ref_code := NEW.raw_user_meta_data->>'referral_code';
  IF ref_code IS NOT NULL AND length(ref_code) = 6 THEN
    SELECT id INTO ref_user_id FROM public.profiles WHERE investor_id = upper(ref_code) LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, investor_id, username, full_name, email, phone, referred_by)
  VALUES (
    NEW.id,
    new_iid,
    uname,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    ref_user_id
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'investor');

  -- Award referral points
  IF ref_user_id IS NOT NULL THEN
    SELECT (value)::int INTO ref_pts_referrer FROM public.app_config WHERE key = 'referral_points_referrer';
    SELECT (value)::int INTO ref_pts_referred FROM public.app_config WHERE key = 'referral_points_referred';
    INSERT INTO public.referrals (referrer_id, referred_id, points_awarded) VALUES (ref_user_id, NEW.id, COALESCE(ref_pts_referrer, 50));
    UPDATE public.profiles SET referral_points = referral_points + COALESCE(ref_pts_referrer, 50) WHERE id = ref_user_id;
    UPDATE public.profiles SET referral_points = referral_points + COALESCE(ref_pts_referred, 25) WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ Helper: total shares owned ============
CREATE OR REPLACE FUNCTION public.user_shares_owned(_user_id UUID)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(shares), 0)::int
  FROM public.transactions
  WHERE user_id = _user_id AND type = 'share_issuance' AND status = 'completed'
$$;

-- ============ RLS Policies ============

-- profiles: users see own, admins see all; public can read minimal info via username only via separate view
CREATE POLICY "profiles_self_read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_read" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance'));
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_admin_update" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- public-safe view exposing only username + investor_id for chat directory
CREATE VIEW public.public_profiles AS
  SELECT id, username, investor_id FROM public.profiles;
GRANT SELECT ON public.public_profiles TO authenticated, anon;

-- user_roles
CREATE POLICY "roles_self_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- app_config
CREATE POLICY "config_read_all_auth" ON public.app_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "config_read_anon" ON public.app_config FOR SELECT TO anon USING (true);
CREATE POLICY "config_admin_write" ON public.app_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- packages: public readable, admin write
CREATE POLICY "packages_public_read" ON public.packages FOR SELECT USING (true);
CREATE POLICY "packages_admin_write" ON public.packages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- subscriptions
CREATE POLICY "subs_self_read" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance'));
CREATE POLICY "subs_self_insert" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subs_admin_update" ON public.subscriptions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- transactions
CREATE POLICY "tx_self_read" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'finance'));
CREATE POLICY "tx_self_insert_deposit" ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND type = 'deposit' AND status = 'pending');
CREATE POLICY "tx_admin_all" ON public.transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- kyc
CREATE POLICY "kyc_self_read" ON public.kyc_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "kyc_self_insert" ON public.kyc_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "kyc_admin_update" ON public.kyc_submissions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- referrals
CREATE POLICY "ref_self_read" ON public.referrals FOR SELECT TO authenticated USING (auth.uid() = referrer_id OR auth.uid() = referred_id OR public.has_role(auth.uid(), 'admin'));

-- messages
CREATE POLICY "msg_public_read" ON public.messages FOR SELECT TO authenticated USING (channel = 'public' OR sender_id = auth.uid() OR recipient_id = auth.uid());
CREATE POLICY "msg_self_insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "msg_admin_delete" ON public.messages FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin') OR auth.uid() = sender_id);

-- interest registrations: public can insert, admin can read
CREATE POLICY "interest_public_insert" ON public.interest_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "interest_admin_read" ON public.interest_registrations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- audit
CREATE POLICY "audit_admin_read" ON public.audit_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ Storage buckets ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('kyc-documents', 'kyc-documents', false),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_self_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatars_self_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "kyc_self_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "kyc_self_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'kyc-documents' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
