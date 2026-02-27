-- Criar função que protege campos sensíveis na tabela profiles
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role_value text;
BEGIN
  -- Obter role do usuário atual
  user_role_value := get_current_user_role();
  
  -- Se não for admin, não permitir alteração de campos sensíveis
  IF user_role_value != 'admin' THEN
    -- Proteger campo role
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      RAISE EXCEPTION 'Não é permitido alterar o campo role. Apenas administradores podem fazer isso.';
    END IF;
    
    -- Proteger campo is_active
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      RAISE EXCEPTION 'Não é permitido alterar o campo is_active. Apenas administradores podem fazer isso.';
    END IF;
    
    -- Proteger campo custom_role_id
    IF OLD.custom_role_id IS DISTINCT FROM NEW.custom_role_id THEN
      RAISE EXCEPTION 'Não é permitido alterar o campo custom_role_id. Apenas administradores podem fazer isso.';
    END IF;
    
    -- Proteger campo user_id (nunca deve ser alterado)
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
      RAISE EXCEPTION 'Não é permitido alterar o campo user_id.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger que executa antes de updates na tabela profiles
DROP TRIGGER IF EXISTS protect_profile_sensitive_fields ON public.profiles;
CREATE TRIGGER protect_profile_sensitive_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- Adicionar comentário explicativo
COMMENT ON FUNCTION public.protect_sensitive_profile_fields() IS 
'Protege campos sensíveis (role, is_active, custom_role_id, user_id) de serem alterados por usuários não-admin';