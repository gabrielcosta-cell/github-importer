-- Adicionar módulo CRM para controle de permissões
INSERT INTO public.modules (name, display_name, description, icon, is_active)
VALUES ('crm', 'CRM', 'Sistema de Gerenciamento de Relacionamento com Cliente', 'kanban', true)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active;