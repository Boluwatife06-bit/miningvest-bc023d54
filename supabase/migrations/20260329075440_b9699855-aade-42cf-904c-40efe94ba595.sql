
-- Fix 1: Withdrawals INSERT policy - enforce status must be 'pending'
DROP POLICY IF EXISTS "Users can create own withdrawals" ON public.withdrawals;
CREATE POLICY "Users can create own withdrawals"
  ON public.withdrawals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Fix 2: Profiles INSERT policy - lock referred_by to prevent arbitrary referrer claims
-- We allow referred_by to be set on insert but it cannot be changed on update
DROP POLICY IF EXISTS "Users can update own profile safely" ON public.profiles;
CREATE POLICY "Users can update own profile safely"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND balance = (SELECT p.balance FROM profiles p WHERE p.user_id = auth.uid())
    AND referral_earnings = (SELECT p.referral_earnings FROM profiles p WHERE p.user_id = auth.uid())
    AND referred_by IS NOT DISTINCT FROM (SELECT p.referred_by FROM profiles p WHERE p.user_id = auth.uid())
  );
