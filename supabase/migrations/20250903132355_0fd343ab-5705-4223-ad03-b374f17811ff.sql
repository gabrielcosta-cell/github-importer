-- Remover a política atual de SELECT restritiva
DROP POLICY IF EXISTS "contracts_secure_select" ON public.contracts;

-- Criar nova política mais permissiva para visualização de contratos
-- Permite admin, criador do contrato, ou usuários com papéis específicos
CREATE POLICY "contracts_view_policy"
ON public.contracts
FOR SELECT
USING (
  -- Admins podem ver tudo
  get_current_user_role() = 'admin'::text 
  OR 
  -- Criador pode ver seus próprios contratos
  created_by = auth.uid()
  OR
  -- Closers podem ver todos os contratos
  get_current_user_role() = 'closer'::text
  OR
  -- Usuários autenticados podem ver contratos (para head de projetos e outros papéis)
  auth.uid() IS NOT NULL
);