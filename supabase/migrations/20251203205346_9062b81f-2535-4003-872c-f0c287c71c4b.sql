-- Corrigir dados de Nov/2025

-- 1. Deletar a variável errada do 8 Milimetros (deveria ser Upsell, não variável)
DELETE FROM crm_card_variable_history 
WHERE id = '3dcbed66-8458-4b9b-b810-e1dc90b17c38';

-- 2. Inserir como Upsell para 8 Milimetros
INSERT INTO crm_card_upsell_history (card_id, upsell_type, upsell_value, upsell_month, upsell_year, payment_type)
VALUES ('f893ad91-129d-465f-92f7-3f9b4e0103ab', 'upsell', 850, 11, 2025, 'recorrente');

-- 3. Corrigir o valor da variável do Aluga Aí (6.5951 -> 6595.10)
UPDATE crm_card_variable_history 
SET variable_value = 6595.10 
WHERE id = '05820fce-7324-4de4-8975-e3f86e23317d';