-- Atualizar o display_name do módulo projetos para "Lista de espera"
UPDATE modules 
SET 
  display_name = 'Lista de espera',
  description = 'Gerenciamento de lista de espera e projetos reservados',
  updated_at = now()
WHERE name = 'projetos';