-- =========================================
-- MIGRAÇÃO COMPLETA PARA CORRIGIR TODOS OS ACESSOS
-- =========================================

-- 1. CORRIGIR POLÍTICAS DA TABELA BUSINESSES
-- =========================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "businesses_select_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_insert_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_update_policy" ON public.businesses;
DROP POLICY IF EXISTS "businesses_delete_policy" ON public.businesses;

-- Habilitar RLS na tabela businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Todos usuários autenticados podem ver todos os negócios
CREATE POLICY "businesses_select_policy"
ON public.businesses
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Política INSERT: Todos usuários autenticados podem criar negócios
CREATE POLICY "businesses_insert_policy"
ON public.businesses
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Política UPDATE: Admins podem editar tudo, outros podem editar se são responsáveis ou criaram
CREATE POLICY "businesses_update_policy"
ON public.businesses
FOR UPDATE
USING (
  get_current_user_role() = 'admin'::text 
  OR responsible_user_id = auth.uid() 
  OR created_by = auth.uid()
);

-- Política DELETE: Apenas admins podem deletar
CREATE POLICY "businesses_delete_policy"
ON public.businesses
FOR DELETE
USING (get_current_user_role() = 'admin'::text);

-- 2. CORRIGIR POLÍTICAS DA TABELA CELEBRATION_TEMPLATES
-- =====================================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "celebration_templates_select_policy" ON public.celebration_templates;
DROP POLICY IF EXISTS "celebration_templates_insert_policy" ON public.celebration_templates;
DROP POLICY IF EXISTS "celebration_templates_update_policy" ON public.celebration_templates;
DROP POLICY IF EXISTS "celebration_templates_delete_policy" ON public.celebration_templates;

-- Habilitar RLS na tabela celebration_templates
ALTER TABLE public.celebration_templates ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Todos usuários autenticados podem ver templates ativos
CREATE POLICY "celebration_templates_select_policy"
ON public.celebration_templates
FOR SELECT
USING (auth.uid() IS NOT NULL AND is_active = true);

-- Política INSERT: Apenas admins podem criar templates
CREATE POLICY "celebration_templates_insert_policy"
ON public.celebration_templates
FOR INSERT
WITH CHECK (get_current_user_role() = 'admin'::text);

-- Política UPDATE: Apenas admins podem editar templates
CREATE POLICY "celebration_templates_update_policy"
ON public.celebration_templates
FOR UPDATE
USING (get_current_user_role() = 'admin'::text);

-- Política DELETE: Apenas admins podem deletar templates
CREATE POLICY "celebration_templates_delete_policy"
ON public.celebration_templates
FOR DELETE
USING (get_current_user_role() = 'admin'::text);

-- 3. CORRIGIR POLÍTICAS DA TABELA PROFILES
-- ========================================

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Habilitar RLS na tabela profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Todos usuários autenticados podem ver todos perfis
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Política INSERT: Apenas admins podem criar perfis
CREATE POLICY "profiles_insert_policy"
ON public.profiles
FOR INSERT
WITH CHECK (get_current_user_role() = 'admin'::text);

-- Política UPDATE: Admins podem editar qualquer perfil, usuários podem editar o próprio
CREATE POLICY "profiles_update_policy"
ON public.profiles
FOR UPDATE
USING (
  get_current_user_role() = 'admin'::text 
  OR user_id = auth.uid()
);

-- Política DELETE: Apenas admins podem deletar perfis
CREATE POLICY "profiles_delete_policy"
ON public.profiles
FOR DELETE
USING (get_current_user_role() = 'admin'::text);

-- 4. VERIFICAR E CORRIGIR FUNÇÃO get_current_user_role
-- ===================================================

-- Recriar a função para garantir que está funcionando corretamente
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN auth.uid() IS NULL THEN 'anonymous'
      ELSE COALESCE(
        (SELECT role FROM public.profiles WHERE user_id = auth.uid() AND is_active = true LIMIT 1),
        'user'
      )
    END;
$$;

-- 5. CRIAR ÍNDICES PARA MELHOR PERFORMANCE
-- =======================================

-- Índice para melhorar consultas por responsible_user_id na tabela businesses
CREATE INDEX IF NOT EXISTS idx_businesses_responsible_user_id ON public.businesses(responsible_user_id);

-- Índice para melhorar consultas por created_by na tabela businesses
CREATE INDEX IF NOT EXISTS idx_businesses_created_by ON public.businesses(created_by);

-- Índice para melhorar consultas por data na tabela businesses
CREATE INDEX IF NOT EXISTS idx_businesses_created_at ON public.businesses(created_at);

-- Índice para melhorar consultas por user_id na tabela profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- 6. GRANT PERMISSIONS EXPLÍCITAS
-- ===============================

-- Garantir que authenticated users tenham acesso às tabelas
GRANT SELECT, INSERT, UPDATE ON public.businesses TO authenticated;
GRANT SELECT ON public.celebration_templates TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- Garantir que admins tenham acesso completo
GRANT ALL ON public.businesses TO authenticated;
GRANT ALL ON public.celebration_templates TO authenticated;
GRANT ALL ON public.profiles TO authenticated;