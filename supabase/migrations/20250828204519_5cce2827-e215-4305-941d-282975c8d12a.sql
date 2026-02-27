-- Fix security vulnerability in businesses table
-- Remove duplicate and insecure policies

-- 1. Drop existing duplicate SELECT policies
DROP POLICY IF EXISTS "Users can view their assigned businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can view businesses" ON public.businesses;

-- 2. Drop existing UPDATE policy to recreate it more securely
DROP POLICY IF EXISTS "Users can update their businesses" ON public.businesses;

-- 3. Create secure SELECT policy that properly handles NULL values
CREATE POLICY "secure_businesses_select" ON public.businesses
FOR SELECT TO authenticated
USING (
  -- Only allow access if user is admin OR explicitly assigned/created the business
  (get_current_user_role() = 'admin'::text) 
  OR 
  (
    -- Must have explicit assignment - no NULL values allowed
    (responsible_user_id IS NOT NULL AND responsible_user_id = auth.uid())
    OR 
    (created_by IS NOT NULL AND created_by = auth.uid())
  )
);

-- 4. Create secure UPDATE policy
CREATE POLICY "secure_businesses_update" ON public.businesses
FOR UPDATE TO authenticated
USING (
  -- Only allow updates if user is admin OR explicitly assigned/created the business
  (get_current_user_role() = 'admin'::text) 
  OR 
  (
    -- Must have explicit assignment - no NULL values allowed
    (responsible_user_id IS NOT NULL AND responsible_user_id = auth.uid())
    OR 
    (created_by IS NOT NULL AND created_by = auth.uid())
  )
);

-- 5. Ensure created_by is always set for new records
-- Update existing records with NULL created_by to use first available user
UPDATE public.businesses 
SET created_by = (SELECT user_id FROM public.profiles LIMIT 1)
WHERE created_by IS NULL;

-- 6. Make created_by NOT NULL to prevent future security issues
ALTER TABLE public.businesses 
ALTER COLUMN created_by SET NOT NULL;

-- 7. Add comment explaining the security measures
COMMENT ON TABLE public.businesses IS 'Customer business data - Access restricted to assigned users and admins only. created_by field is mandatory for security.';