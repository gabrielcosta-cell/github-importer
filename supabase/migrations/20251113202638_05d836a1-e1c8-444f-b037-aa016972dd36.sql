
-- Criar etiquetas do CSM baseadas na imagem fornecida
INSERT INTO public.crm_tags (name, color, module_scope, is_system, is_active, created_by)
VALUES 
  ('POSSÍVEL CHURN', '#EAB308', 'csm', true, true, (SELECT id FROM auth.users LIMIT 1)),
  ('AVISO PRÉVIO', '#DC2626', 'csm', true, true, (SELECT id FROM auth.users LIMIT 1)),
  ('PRÉ CHURN', '#DC2626', 'csm', true, true, (SELECT id FROM auth.users LIMIT 1)),
  ('CANCELADO', '#EC4899', 'csm', true, true, (SELECT id FROM auth.users LIMIT 1)),
  ('TRATATIVA DE CHURN', '#F472B6', 'csm', true, true, (SELECT id FROM auth.users LIMIT 1)),
  ('TRANSIÇÃO', '#EAB308', 'csm', true, true, (SELECT id FROM auth.users LIMIT 1)),
  ('ACOMPANHAMENTO', '#EAB308', 'csm', true, true, (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (name) DO NOTHING;
