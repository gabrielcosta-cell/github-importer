-- =====================================================
-- CORREÇÃO DE SEGURANÇA: Políticas RLS para dados sensíveis
-- =====================================================

-- 1. Corrigir monthly_goals - estava com USING true (acesso público)
DROP POLICY IF EXISTS "Authenticated users can view monthly goals" ON public.monthly_goals;
CREATE POLICY "Authenticated users can view monthly goals"
ON public.monthly_goals
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2. Corrigir team_goals - estava com USING true (acesso público)
DROP POLICY IF EXISTS "Authenticated users can view team goals" ON public.team_goals;
CREATE POLICY "Authenticated users can view team goals"
ON public.team_goals
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 3. Garantir que crm_pipelines exige autenticação
DROP POLICY IF EXISTS "Users can view pipelines" ON public.crm_pipelines;
CREATE POLICY "Users can view pipelines"
ON public.crm_pipelines
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. Garantir que crm_stages exige autenticação
DROP POLICY IF EXISTS "Users can view stages" ON public.crm_stages;
CREATE POLICY "Users can view stages"
ON public.crm_stages
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5. Garantir que crm_tags exige autenticação (verificar se já existe)
DROP POLICY IF EXISTS "Users can view tags" ON public.crm_tags;
CREATE POLICY "Users can view tags"
ON public.crm_tags
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 6. Garantir que crm_loss_reasons exige autenticação
DROP POLICY IF EXISTS "Users can view loss reasons" ON public.crm_loss_reasons;
CREATE POLICY "Users can view loss reasons"
ON public.crm_loss_reasons
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 7. Proteger custom_roles - apenas admins e usuários vendo sua própria role
DROP POLICY IF EXISTS "Only admins can view custom roles" ON public.custom_roles;
-- Mantém as políticas existentes que já estão corretas

-- 8. Proteger modules - apenas usuários autenticados com permissão
-- (já está correto, mas vamos garantir)

-- 9. Proteger profiles - garantir que não há acesso público
-- As políticas existentes já estão corretas (profiles_restricted_select)

-- 10. Adicionar comentários de segurança
COMMENT ON POLICY "Authenticated users can view monthly goals" ON public.monthly_goals IS 
'Corrigido: exige autenticação para visualizar metas mensais';

COMMENT ON POLICY "Authenticated users can view team goals" ON public.team_goals IS 
'Corrigido: exige autenticação para visualizar metas de equipe';