-- Criar o módulo Analise e Bench
INSERT INTO public.modules (name, display_name, description, icon, is_active)
VALUES ('analise_bench', 'Análise e Benchmark', 'Módulo de análise e benchmark de dados', 'BarChart2', true)
ON CONFLICT (name) DO NOTHING;

-- Adicionar permissões completas para o usuário vinicius.cado@dotconceito.com
INSERT INTO public.user_module_permissions (user_id, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  '5f1a280a-d6e6-43a4-8858-679aac41c77d'::uuid,
  id,
  true,
  true,
  true,
  true
FROM public.modules
WHERE name = 'analise_bench'
ON CONFLICT (user_id, module_id) 
DO UPDATE SET 
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = true,
  updated_at = now();