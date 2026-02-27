-- Criar pipeline "Leads perdidos" para centralizar leads perdidos do SDR
DO $$
DECLARE
  sdr_pipeline_id UUID := 'cb0f6956-8786-45a6-8953-c20775c1c9fa';
  new_pipeline_id UUID;
  admin_user_id UUID;
BEGIN
  -- Buscar um admin para ser o criador
  SELECT user_id INTO admin_user_id
  FROM profiles
  WHERE role = 'admin'
  LIMIT 1;

  -- Criar o pipeline "Leads perdidos"
  INSERT INTO crm_pipelines (name, description, created_by, position, is_active)
  VALUES (
    'Leads perdidos',
    'Centraliza todos os leads marcados como perdidos no pipeline SDR | Principal',
    admin_user_id,
    999, -- Posição alta para aparecer no final
    true
  )
  RETURNING id INTO new_pipeline_id;

  -- Copiar as etapas do pipeline SDR | Principal para o novo pipeline
  INSERT INTO crm_stages (pipeline_id, name, color, position, is_active)
  SELECT 
    new_pipeline_id,
    name,
    color,
    position,
    is_active
  FROM crm_stages
  WHERE pipeline_id = sdr_pipeline_id
  ORDER BY position;

  RAISE NOTICE 'Pipeline "Leads perdidos" criado com sucesso: %', new_pipeline_id;
END $$;