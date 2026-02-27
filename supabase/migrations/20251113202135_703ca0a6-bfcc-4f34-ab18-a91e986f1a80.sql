
-- Atualizar tags para serem apenas do CRM (ocultar do CSM)
UPDATE public.crm_tags 
SET module_scope = 'crm', updated_at = now()
WHERE name IN ('INDICAÇÃO', 'NÃO INVESTE EM MARKETING', 'ORÇAMENTO INDEFINIDO', 'PÓS-NÃO-VENDA', 'QUALIFICADO PMV', 'QUALIFICADO SERVIÇO', 'SEM URGÊNCIA');

-- Desativar a tag NICHO (remover do CRM e CSM)
UPDATE public.crm_tags 
SET is_active = false, updated_at = now()
WHERE name = 'NICHO';
