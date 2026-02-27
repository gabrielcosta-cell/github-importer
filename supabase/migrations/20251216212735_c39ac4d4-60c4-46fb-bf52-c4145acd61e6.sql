
-- Excluir etapas do pipeline duplicado "Clientes antigos" sem cards
DELETE FROM crm_stages WHERE pipeline_id = '3c3e0032-4224-4026-acf9-5093853cd9ad';

-- Excluir o pipeline duplicado
DELETE FROM crm_pipelines WHERE id = '3c3e0032-4224-4026-acf9-5093853cd9ad';
