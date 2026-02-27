-- FIX SECURITY WARNING: Function Search Path Mutable
-- Update functions to have explicit search_path for security

-- Fix the log_sensitive_access function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  table_name TEXT,
  action_type TEXT,
  record_id UUID,
  user_id UUID DEFAULT auth.uid()
)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Log to audit table
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
$$;

-- Update other existing functions that might not have search_path set
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário'), NEW.email, 'sdr');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_crm_activities_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_user_profile(user_email text, user_name text, user_role text, user_department text DEFAULT NULL::text, user_phone text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_user_id uuid;
BEGIN
  -- Gerar um ID temporário para o usuário
  new_user_id := gen_random_uuid();
  
  -- Inserir perfil com status pendente
  INSERT INTO public.profiles (
    user_id,
    name,
    email,
    role,
    department,
    phone,
    is_active
  ) VALUES (
    new_user_id,
    user_name,
    user_email,
    user_role::text,
    user_department,
    user_phone,
    false -- Inativo até confirmar email
  );
  
  RETURN new_user_id;
END;
$$;