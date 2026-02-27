-- Adicionar o módulo de gestão de contratos
INSERT INTO public.modules (name, display_name, description, icon, is_active) 
VALUES ('gestao_contratos', 'Gestão de Contratos', 'Módulo para gestão de contratos de clientes', 'FileText', true)
ON CONFLICT (name) DO NOTHING;