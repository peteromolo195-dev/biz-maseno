
-- Function to recalculate wallet balance for a user (use text cast to avoid enum commit issue)
CREATE OR REPLACE FUNCTION public.recalculate_wallet_balance(_user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT COALESCE(SUM(amount_kes), 0) FROM public.transactions
     WHERE user_id = _user_id AND type::text = 'deposit' AND status::text IN ('approved', 'completed'))
    -
    (SELECT COALESCE(SUM(amount_kes), 0) FROM public.transactions
     WHERE user_id = _user_id AND type::text = 'withdrawal' AND status::text IN ('approved', 'completed'))
    -
    (SELECT COALESCE(SUM(amount_kes), 0) FROM public.transactions
     WHERE user_id = _user_id AND type::text = 'share_issuance' AND status::text = 'completed')
  , 0);
$$;

-- Trigger function to update wallet balance after transaction changes
CREATE OR REPLACE FUNCTION public.trigger_update_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id uuid;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  UPDATE public.profiles
    SET wallet_balance = public.recalculate_wallet_balance(target_user_id)
    WHERE id = target_user_id;
  RETURN NEW;
END;
$$;

-- Create trigger on transactions
CREATE TRIGGER trg_update_wallet
AFTER INSERT OR UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_update_wallet();

-- Allow users to insert withdrawal transactions (pending)
CREATE POLICY "tx_self_insert_withdrawal" ON public.transactions
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND type::text = 'withdrawal'
  AND status::text = 'pending'
);
