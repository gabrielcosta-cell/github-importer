-- Deletar as copies manuais que criei para Cross Equipamentos
DELETE FROM success_case_copies 
WHERE client_name = 'Cross Equipamentos' 
AND ai_provider = 'manual_creation';