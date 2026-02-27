-- Atualizar título dos leads existentes para usar apenas o nome da empresa
UPDATE public.crm_cards 
SET title = company_name
WHERE company_name IS NOT NULL AND company_name != '';