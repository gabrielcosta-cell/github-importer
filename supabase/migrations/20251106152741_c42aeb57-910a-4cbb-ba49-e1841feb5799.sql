-- =========================================
-- CORREÇÃO DE SEGURANÇA: Proteger Dados Sensíveis
-- =========================================

-- 1. PROTEGER PERFIS DE FUNCIONÁRIOS
-- Remover política que permite ver todos os perfis
DROP POLICY IF EXISTS "Allow authenticated inserts for profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Criar política restritiva: usuários só veem seu próprio perfil (ou admins veem tudo)
CREATE POLICY "Users can view own profile or admins can view all"
ON public.profiles FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  get_current_user_role() = 'admin'
);

-- Política para permitir inserção apenas pelo service role ou admins
CREATE POLICY "Service role and admins can insert profiles"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  get_current_user_role() = 'admin'
  OR auth.jwt() ->> 'role' = 'service_role'
);

-- Política para permitir atualização apenas do próprio perfil ou por admins
CREATE POLICY "Users can update own profile or admins can update any"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  get_current_user_role() = 'admin'
)
WITH CHECK (
  auth.uid() = user_id 
  OR 
  get_current_user_role() = 'admin'
);

-- 2. PROTEGER CONTATOS DO CRM
-- Remover política que permite ver todos os cards
DROP POLICY IF EXISTS "Authenticated users can view all cards" ON public.crm_cards;

-- Criar política restritiva: usuários só veem cards atribuídos a eles ou criados por eles
CREATE POLICY "Users can view assigned or created cards or admins can view all"
ON public.crm_cards FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR
  assigned_to = auth.uid()
  OR
  get_current_user_role() = 'admin'
);

-- 3. CORRIGIR POLÍTICA FRACA NO CRM DE VENDAS (businesses)
-- Verificar se existe política com fallback 'true'
DROP POLICY IF EXISTS "Users can view assigned businesses" ON public.businesses;

-- Criar política forte sem fallback
CREATE POLICY "Users can view own or assigned businesses"
ON public.businesses FOR SELECT
TO authenticated
USING (
  created_by = auth.uid()
  OR
  responsible_user_id = auth.uid()
  OR
  get_current_user_role() = 'admin'
);

-- 4. GARANTIR QUE TODAS AS TABELAS SENSÍVEIS TEM RLS HABILITADO
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- 5. PROTEGER OUTRAS TABELAS SENSÍVEIS
-- Audit logs devem ser visíveis apenas para admins
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Only admins can view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

-- Celebrações podem ser vistas por todos (não é sensível)
-- Custom roles e permissões devem ser visíveis apenas para admins
DROP POLICY IF EXISTS "Users can view custom roles" ON public.custom_roles;
CREATE POLICY "Only admins can view custom roles"
ON public.custom_roles FOR SELECT
TO authenticated
USING (get_current_user_role() = 'admin');

-- 6. ADICIONAR ÍNDICES PARA PERFORMANCE DAS POLÍTICAS RLS
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_cards_created_by ON public.crm_cards(created_by);
CREATE INDEX IF NOT EXISTS idx_crm_cards_assigned_to ON public.crm_cards(assigned_to);
CREATE INDEX IF NOT EXISTS idx_businesses_created_by ON public.businesses(created_by);
CREATE INDEX IF NOT EXISTS idx_businesses_responsible_user_id ON public.businesses(responsible_user_id);