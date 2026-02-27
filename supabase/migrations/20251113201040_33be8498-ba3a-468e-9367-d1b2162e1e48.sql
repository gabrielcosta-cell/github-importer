-- Criar etiquetas automáticas do sistema para CSM
INSERT INTO public.crm_tags (name, color, is_system, is_active, module_scope)
VALUES 
  ('HEALTH SCORE CRÍTICO', '#EF4444', true, true, 'csm'),
  ('HEALTH SCORE BAIXO', '#F59E0B', true, true, 'csm'),
  ('RENOVAÇÃO PRÓXIMA', '#3B82F6', true, true, 'csm'),
  ('INADIMPLENTE', '#DC2626', true, true, 'csm')
ON CONFLICT DO NOTHING;

-- Comentários explicativos
COMMENT ON TABLE public.crm_tags IS 'Etiquetas para categorizar cards no CRM e CSM. Etiquetas de sistema (is_system=true) são aplicadas automaticamente baseadas em regras.';
