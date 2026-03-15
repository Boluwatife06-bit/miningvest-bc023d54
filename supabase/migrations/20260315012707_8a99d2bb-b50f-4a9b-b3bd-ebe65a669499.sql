CREATE OR REPLACE FUNCTION public.atomic_credit_balance(p_user_id uuid, p_amount bigint)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE profiles SET balance = balance + p_amount, updated_at = now() WHERE user_id = p_user_id;
$$;