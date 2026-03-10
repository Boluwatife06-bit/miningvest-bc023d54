
-- 1. Add last_roi_date column to investments for idempotency
ALTER TABLE public.investments ADD COLUMN IF NOT EXISTS last_roi_date date;

-- 2. Drop the permissive user UPDATE policy on profiles (allows writing balance)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 3. Create restricted UPDATE policy - users can only update non-financial columns
CREATE POLICY "Users can update own profile safely"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND balance = (SELECT p.balance FROM public.profiles p WHERE p.user_id = auth.uid())
  AND referral_earnings = (SELECT p.referral_earnings FROM public.profiles p WHERE p.user_id = auth.uid())
);

-- 4. Create place_investment SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.place_investment(p_product_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_price bigint;
  v_roi bigint;
  v_rows_updated int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Get product details server-side
  SELECT price, roi INTO v_price, v_roi
  FROM public.products
  WHERE id = p_product_id AND is_active = true;

  IF v_price IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Product not found or inactive');
  END IF;

  -- Atomically deduct balance
  UPDATE public.profiles
  SET balance = balance - v_price, updated_at = now()
  WHERE user_id = v_user_id AND balance >= v_price;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Insert investment with server-verified amounts
  INSERT INTO public.investments (user_id, product_id, amount, roi, status)
  VALUES (v_user_id, p_product_id, v_price, v_roi, 'active');

  RETURN json_build_object('success', true);
END;
$$;

-- 5. Create admin_adjust_balance SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(p_user_id uuid, p_amount bigint)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
  v_new_balance bigint;
BEGIN
  v_caller := auth.uid();
  IF NOT public.has_role(v_caller, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE public.profiles
  SET balance = balance + p_amount, updated_at = now()
  WHERE user_id = p_user_id AND balance + p_amount >= 0
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance or user not found');
  END IF;

  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- 6. Drop the direct INSERT policy on investments (force use of RPC)
DROP POLICY IF EXISTS "Users can create own investments" ON public.investments;
