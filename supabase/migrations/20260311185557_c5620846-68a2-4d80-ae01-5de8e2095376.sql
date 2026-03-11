
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO public
  WITH CHECK (
    auth.uid() = user_id
    AND balance = 0
    AND referral_earnings = 0
  );
