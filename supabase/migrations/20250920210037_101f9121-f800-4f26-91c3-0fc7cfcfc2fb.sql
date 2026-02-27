-- PHASE 1: CRITICAL DATA PROTECTION - Fix RLS Policies

-- 1. FIX BUSINESSES TABLE - Remove overly permissive policies
DROP POLICY IF EXISTS "businesses_select_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_update_policy" ON public.businesses;

-- Replace with secure policies
CREATE POLICY "businesses_secure_select_v2" ON public.businesses 
FOR SELECT USING (
  get_current_user_role() = 'admin' OR 
  created_by = auth.uid() OR 
  responsible_user_id = auth.uid()
);

CREATE POLICY "businesses_secure_insert_v2" ON public.businesses 
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND 
  created_by = auth.uid()
);

CREATE POLICY "businesses_secure_update_v2" ON public.businesses 
FOR UPDATE USING (
  get_current_user_role() = 'admin' OR 
  created_by = auth.uid() OR 
  responsible_user_id = auth.uid()
);

-- 2. FIX PROFILES TABLE - Remove overly permissive policy
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Keep only the secure policies (they already exist and are correct)
-- profiles_secure_select: users see own data + admins see all
-- profiles_secure_update: users update own data + admins update all

-- 3. SECURE COPY_FORMS - Restrict to marketing team and admins
DROP POLICY IF EXISTS "Authenticated users can view copy forms" ON public.copy_forms;

CREATE POLICY "copy_forms_secure_select" ON public.copy_forms 
FOR SELECT USING (
  get_current_user_role() = 'admin' OR 
  created_by = auth.uid()
);

-- 4. ENHANCE CONTRACTS SECURITY - More restrictive access
DROP POLICY IF EXISTS "contracts_view_policy" ON public.contracts;

CREATE POLICY "contracts_secure_select" ON public.contracts 
FOR SELECT USING (
  get_current_user_role() = 'admin' OR 
  created_by = auth.uid() OR
  get_current_user_role() = 'closer'
);

-- 5. SECURE CRM CARDS - Limit to assigned users and admins
DROP POLICY IF EXISTS "Authenticated users can view cards" ON public.crm_cards;

CREATE POLICY "crm_cards_secure_select" ON public.crm_cards 
FOR SELECT USING (
  get_current_user_role() = 'admin' OR 
  created_by = auth.uid() OR 
  assigned_to = auth.uid()
);

-- 6. SECURE COMMISSIONS - Only own commissions and admin access
-- (This one is already secure, keeping as is)

-- 7. ADD AUDIT LOGGING FUNCTION
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  table_name TEXT,
  action_type TEXT,
  record_id UUID,
  user_id UUID DEFAULT auth.uid()
)
RETURNS VOID AS $$
BEGIN
  -- Log to a simple table for now (we'll create this table next)
  INSERT INTO public.audit_logs (
    table_name,
    action_type,
    record_id,
    user_id,
    accessed_at
  ) VALUES (
    table_name,
    action_type,
    record_id,
    user_id,
    NOW()
  );
EXCEPTION
  WHEN others THEN
    -- Don't let audit logging break the main operation
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CREATE AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  action_type TEXT NOT NULL,
  record_id UUID,
  user_id UUID,
  accessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs 
FOR ALL USING (get_current_user_role() = 'admin');