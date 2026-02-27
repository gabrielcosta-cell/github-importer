-- Usar o primeiro usuário encontrado para created_by
WITH first_user AS (
  SELECT user_id FROM profiles LIMIT 1
)
INSERT INTO businesses (name, value, source, notes, status, created_by) 
SELECT 'Trentin Consultoria', 0, 'Inbound', 'Cliente adicionado pelo closer - recuperado', 'Prospecção', user_id FROM first_user
UNION ALL
SELECT 'Nós Tecnologia', 0, 'Inbound', 'Cliente adicionado pelo closer - recuperado', 'Prospecção', user_id FROM first_user
UNION ALL
SELECT 'CEI Educar', 0, 'Inbound', 'Cliente adicionado pelo closer - recuperado', 'Prospecção', user_id FROM first_user
UNION ALL
SELECT 'Grupo Downtown', 0, 'Inbound', 'Cliente adicionado pelo closer - recuperado', 'Prospecção', user_id FROM first_user
UNION ALL
SELECT 'Felicità Pizzaria', 0, 'Inbound', 'Cliente adicionado pelo closer - recuperado', 'Prospecção', user_id FROM first_user;