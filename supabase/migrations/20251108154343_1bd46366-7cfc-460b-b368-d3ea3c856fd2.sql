-- Adicionar clientes de exemplo para teste do formulário de Análise e Benchmarking
-- Estes cards serão visíveis para o usuário atual devido à política RLS

INSERT INTO public.crm_cards (
  stage_id,
  pipeline_id,
  title,
  company_name,
  created_by,
  position
) VALUES
  (
    '94f3f6c9-4a58-433a-a3cc-42a38515263e',
    '1242a985-2f74-4b4a-bc0e-c045a3951d65',
    'Tech Solutions',
    'Tech Solutions',
    '83845e88-751a-4610-8247-d90588d62902',
    0
  ),
  (
    '94f3f6c9-4a58-433a-a3cc-42a38515263e',
    '1242a985-2f74-4b4a-bc0e-c045a3951d65',
    'Marketing Digital Pro',
    'Marketing Digital Pro',
    '83845e88-751a-4610-8247-d90588d62902',
    1
  ),
  (
    '94f3f6c9-4a58-433a-a3cc-42a38515263e',
    '1242a985-2f74-4b4a-bc0e-c045a3951d65',
    'Consultoria Empresarial',
    'Consultoria Empresarial',
    '83845e88-751a-4610-8247-d90588d62902',
    2
  )
ON CONFLICT DO NOTHING;