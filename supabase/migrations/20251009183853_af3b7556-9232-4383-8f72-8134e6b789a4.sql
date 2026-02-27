-- Fix RLS policies for custom_roles table
-- The "Admins can manage custom roles" policy needs explicit WITH CHECK for INSERT

DROP POLICY IF EXISTS "Admins can manage custom roles" ON public.custom_roles;

-- Create separate policies for better clarity and to ensure WITH CHECK works correctly
CREATE POLICY "Admins can view custom roles"
ON public.custom_roles
FOR SELECT
USING (get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert custom roles"
ON public.custom_roles
FOR INSERT
WITH CHECK (
  get_current_user_role() = 'admin' 
  AND created_by = auth.uid()
);

CREATE POLICY "Admins can update custom roles"
ON public.custom_roles
FOR UPDATE
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete custom roles"
ON public.custom_roles
FOR DELETE
USING (get_current_user_role() = 'admin');