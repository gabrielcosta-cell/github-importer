-- Fix security vulnerability in businesses table (corrected)

-- 1. Drop ALL existing policies on businesses table
DROP POLICY IF EXISTS "Users can view their assigned businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can update their businesses" ON public.businesses;
DROP POLICY IF EXISTS "secure_businesses_select" ON public.businesses;
DROP POLICY IF EXISTS "secure_businesses_update" ON public.businesses;

-- 2. Create secure SELECT policy that properly handles NULL values
CREATE POLICY "secure_businesses_select_policy" ON public.businesses
FOR SELECT TO authenticated
USING (
  -- Only allow access if user is admin OR explicitly assigned/created the business
  (get_current_user_role() = 'admin'::text) 
  OR 
  (
    -- Must have explicit assignment - no NULL values bypass security
    (responsible_user_id IS NOT NULL AND responsible_user_id = auth.uid())
    OR 
    (created_by IS NOT NULL AND created_by = auth.uid())
  )
);

-- 3. Create secure UPDATE policy
CREATE POLICY "secure_businesses_update_policy" ON public.businesses
FOR UPDATE TO authenticated
USING (
  -- Only allow updates if user is admin OR explicitly assigned/created the business
  (get_current_user_role() = 'admin'::text) 
  OR 
  (
    -- Must have explicit assignment - no NULL values bypass security
    (responsible_user_id IS NOT NULL AND responsible_user_id = auth.uid())
    OR 
    (created_by IS NOT NULL AND created_by = auth.uid())
  )
);

-- 4. Ensure all businesses have a created_by user (security requirement)
-- First check if there are any NULL values
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.businesses WHERE created_by IS NULL) THEN
    -- Update NULL values with first available user
    UPDATE public.businesses 
    SET created_by = (SELECT user_id FROM public.profiles LIMIT 1)
    WHERE created_by IS NULL;
  END IF;
END $$;