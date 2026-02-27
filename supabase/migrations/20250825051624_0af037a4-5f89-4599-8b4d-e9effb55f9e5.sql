-- Criar função para adicionar usuários (será chamada via edge function)
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_email text,
  user_name text,
  user_role text,
  user_department text DEFAULT NULL,
  user_phone text DEFAULT NULL
)
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