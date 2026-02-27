-- =========================================
-- CORREÇÃO: Remover APENAS Políticas Permissivas Antigas
-- =========================================

-- 1. REMOVER POLÍTICA PERMISSIVA DA TABELA BUSINESSES
-- Esta política permite que qualquer usuário com permissão de dashboard veja TODOS os negócios
DROP POLICY IF EXISTS "businesses_secure_select_v2" ON public.businesses;

-- 2. VERIFICAR SE AS POLÍTICAS RESTRITIVAS JÁ EXISTEM
-- Se não existirem, criar
DO $$
BEGIN
  -- Criar política restritiva para businesses se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'businesses' 
    AND policyname = 'businesses_restricted_select'
  ) THEN
    CREATE POLICY "businesses_restricted_select"
    ON public.businesses FOR SELECT
    TO authenticated
    USING (
      created_by = auth.uid()
      OR
      responsible_user_id = auth.uid()
      OR
      get_current_user_role() = 'admin'
    );
  END IF;

  -- Criar política restritiva para crm_cards se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'crm_cards' 
    AND policyname = 'crm_cards_restricted_select'
  ) THEN
    DROP POLICY IF EXISTS "Authenticated users can view all cards" ON public.crm_cards;
    
    CREATE POLICY "crm_cards_restricted_select"
    ON public.crm_cards FOR SELECT
    TO authenticated
    USING (
      created_by = auth.uid()
      OR
      assigned_to = auth.uid()
      OR
      get_current_user_role() = 'admin'
    );
  END IF;

  -- Criar política restritiva para profiles se não existir
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profiles_restricted_select'
  ) THEN
    DROP POLICY IF EXISTS "profiles_secure_select" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;
    DROP POLICY IF EXISTS "Allow authenticated inserts for profiles" ON public.profiles;
    DROP POLICY IF EXISTS "Allow service role to insert profiles" ON public.profiles;
    
    CREATE POLICY "profiles_restricted_select"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
      user_id = auth.uid()
      OR
      get_current_user_role() = 'admin'
    );
  END IF;
END $$;