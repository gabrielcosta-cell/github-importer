-- =========================================
-- CORREÇÃO CRÍTICA: Remover Políticas Permissivas Remanescentes
-- =========================================

-- 1. REMOVER TODAS AS POLÍTICAS ANTIGAS DA TABELA BUSINESSES
DROP POLICY IF EXISTS "businesses_secure_select_v2" ON public.businesses;
DROP POLICY IF EXISTS "Users can view own or assigned businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can view assigned businesses" ON public.businesses;

-- 2. CRIAR POLÍTICA RESTRITIVA ÚNICA PARA VISUALIZAÇÃO
-- Usuários só veem negócios que criaram, foram atribuídos a eles, ou se são admins
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

-- 3. REMOVER POLÍTICAS ANTIGAS DA TABELA CRM_CARDS
DROP POLICY IF EXISTS "Authenticated users can view all cards" ON public.crm_cards;
DROP POLICY IF EXISTS "Users can view assigned or created cards or admins can view all" ON public.crm_cards;

-- 4. CRIAR POLÍTICA RESTRITIVA ÚNICA PARA CRM_CARDS
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

-- 5. REMOVER POLÍTICAS ANTIGAS DA TABELA PROFILES
DROP POLICY IF EXISTS "profiles_secure_select" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated inserts for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow service role to insert profiles" ON public.profiles;

-- 6. CRIAR POLÍTICA RESTRITIVA ÚNICA PARA PROFILES
CREATE POLICY "profiles_restricted_select"
ON public.profiles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  get_current_user_role() = 'admin'
);

-- Permitir inserção apenas por service role (para criação de novos usuários)
CREATE POLICY "profiles_service_role_insert"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  get_current_user_role() = 'admin'
);

-- 7. GARANTIR UPDATE RESTRITO EM PROFILES
DROP POLICY IF EXISTS "profiles_secure_update" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile or admins can update any" ON public.profiles;

CREATE POLICY "profiles_restricted_update"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  get_current_user_role() = 'admin'
)
WITH CHECK (
  user_id = auth.uid()
  OR
  get_current_user_role() = 'admin'
);

-- 8. GARANTIR QUE RLS ESTÁ HABILITADO EM TODAS AS TABELAS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;