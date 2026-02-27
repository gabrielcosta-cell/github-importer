-- Remover a política atual com bug de case-sensitivity
DROP POLICY IF EXISTS "Users can view cards based on module permissions" ON crm_cards;

-- Criar a política corrigida com comparação case-insensitive usando LOWER()
CREATE POLICY "Users can view cards based on module permissions" ON crm_cards
FOR SELECT
USING (
  (get_current_user_role() = 'admin'::text) 
  OR (created_by = auth.uid()) 
  OR (assigned_to = auth.uid()) 
  OR (user_has_module_permission(auth.uid(), 'crm'::text, 'view'::text) 
      AND (pipeline_id IN ( 
        SELECT crm_pipelines.id FROM crm_pipelines 
        WHERE LOWER(crm_pipelines.name) NOT IN ('clientes ativos', 'clientes perdidos')
      ))) 
  OR (user_has_module_permission(auth.uid(), 'csm'::text, 'view'::text) 
      AND (pipeline_id IN ( 
        SELECT crm_pipelines.id FROM crm_pipelines 
        WHERE LOWER(crm_pipelines.name) IN ('clientes ativos', 'clientes perdidos')
      )))
);