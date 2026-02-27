-- Remover a política antiga restritiva
DROP POLICY IF EXISTS "crm_cards_restricted_select" ON crm_cards;

-- Criar nova política que considera permissões de módulo
CREATE POLICY "Users can view cards based on module permissions"
ON crm_cards
FOR SELECT
USING (
  -- Admin sempre pode ver tudo
  get_current_user_role() = 'admin'
  OR
  -- Criador do card pode ver
  created_by = auth.uid()
  OR
  -- Atribuído ao usuário pode ver
  assigned_to = auth.uid()
  OR
  -- Usuários com permissão no módulo CRM podem ver cards de pipelines do CRM
  (
    user_has_module_permission(auth.uid(), 'crm', 'view')
    AND pipeline_id IN (
      SELECT id FROM crm_pipelines 
      WHERE name NOT IN ('Clientes ativos', 'Clientes Perdidos')
    )
  )
  OR
  -- Usuários com permissão no módulo CSM podem ver cards de pipelines do CSM
  (
    user_has_module_permission(auth.uid(), 'csm', 'view')
    AND pipeline_id IN (
      SELECT id FROM crm_pipelines 
      WHERE name IN ('Clientes ativos', 'Clientes Perdidos')
    )
  )
);