-- Inserir módulo CSM (quadro kanban de gestão de clientes)
INSERT INTO public.modules (name, display_name, description, icon, is_active)
VALUES ('csm', 'CSM - Quadro de Gestão', 'Quadro Kanban para gestão de clientes do Customer Success', 'Kanban', true)
ON CONFLICT (name) DO NOTHING;