-- Criar pipeline "Clientes Perdidos"
INSERT INTO crm_pipelines (name, description, is_active, position, created_by)
VALUES (
  'Clientes Perdidos',
  'Pipeline para gestão de clientes perdidos',
  true,
  999,
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1)
)
ON CONFLICT DO NOTHING;

-- Criar etapas do pipeline Clientes Perdidos (mesmas do pipeline Clientes Ativos)
DO $$
DECLARE
  v_pipeline_id UUID;
BEGIN
  -- Buscar o ID do pipeline Clientes Perdidos
  SELECT id INTO v_pipeline_id 
  FROM crm_pipelines 
  WHERE name = 'Clientes Perdidos' 
  LIMIT 1;

  -- Criar as etapas se o pipeline foi encontrado
  IF v_pipeline_id IS NOT NULL THEN
    INSERT INTO crm_stages (pipeline_id, name, color, position, is_active)
    VALUES
      (v_pipeline_id, 'Onboarding', '#8B5CF6', 0, true),
      (v_pipeline_id, 'Mês Teste', '#06B6D4', 1, true),
      (v_pipeline_id, 'Refinamento', '#F59E0B', 2, true),
      (v_pipeline_id, 'Escala', '#10B981', 3, true),
      (v_pipeline_id, 'Expansão', '#3B82F6', 4, true),
      (v_pipeline_id, 'Renovação', '#6366F1', 5, true),
      (v_pipeline_id, 'Retenção', '#EF4444', 6, true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;