-- Criar pipeline "Leads Excluídos" para CRM
INSERT INTO crm_pipelines (id, name, description, position, is_active, created_by)
SELECT 
  gen_random_uuid(),
  'Leads Excluídos',
  'Funil para leads que foram excluídos do CRM',
  999,
  true,
  (SELECT user_id FROM profiles WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM crm_pipelines WHERE name = 'Leads Excluídos'
);

-- Criar estágio único para o funil de leads excluídos
INSERT INTO crm_stages (id, pipeline_id, name, color, position, is_active)
SELECT 
  gen_random_uuid(),
  p.id,
  'Excluídos',
  '#ef4444',
  0,
  true
FROM crm_pipelines p
WHERE p.name = 'Leads Excluídos'
AND NOT EXISTS (
  SELECT 1 FROM crm_stages s WHERE s.pipeline_id = p.id
);