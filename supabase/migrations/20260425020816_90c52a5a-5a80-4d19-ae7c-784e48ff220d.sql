-- Repoint FKs from auth.users → public.profiles so PostgREST can embed profiles.
-- Safe because profiles.id itself is FK to auth.users(id) ON DELETE CASCADE.

-- transactions
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_approved_by_fkey;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- subscriptions
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_approved_by_fkey;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- kyc_submissions
ALTER TABLE public.kyc_submissions DROP CONSTRAINT IF EXISTS kyc_submissions_user_id_fkey;
ALTER TABLE public.kyc_submissions
  ADD CONSTRAINT kyc_submissions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.kyc_submissions DROP CONSTRAINT IF EXISTS kyc_submissions_reviewed_by_fkey;
ALTER TABLE public.kyc_submissions
  ADD CONSTRAINT kyc_submissions_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- referrals
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey;
ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_referrer_id_fkey
  FOREIGN KEY (referrer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_referred_id_fkey;
ALTER TABLE public.referrals
  ADD CONSTRAINT referrals_referred_id_fkey
  FOREIGN KEY (referred_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- messages
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_recipient_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_recipient_id_fkey
  FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;