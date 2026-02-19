-- Fix the recursive RLS issue on user_roles table
-- Drop the existing problematic admin policy that causes recursion
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Recreate admin policy using the has_role security definer function (avoids recursion)
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
