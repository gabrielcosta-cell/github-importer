-- Criar pipeline "Leads Excluídos" para CSM
INSERT INTO public.crm_pipelines (name, description, position, is_active, created_by)
SELECT 
  'Leads Excluídos CSM',
  'Pipeline para leads excluídos do CSM',
  999,
  true,
  (SELECT user_id FROM public.profiles WHERE role = 'admin' LIMIT 1)
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_pipelines WHERE name = 'Leads Excluídos CSM'
);

-- Criar estágio inicial para o pipeline de leads excluídos CSM
INSERT INTO public.crm_stages (pipeline_id, name, color, position, is_active)
SELECT 
  p.id,
  'Excluídos',
  '#6B7280',
  0,
  true
FROM public.crm_pipelines p
WHERE p.name = 'Leads Excluídos CSM'
  AND NOT EXISTS (
    SELECT 1 FROM public.crm_stages s WHERE s.pipeline_id = p.id
  );