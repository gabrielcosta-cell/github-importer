-- Fase 1: Adicionar coluna project_scope na tabela profiles
-- Esta coluna define qual projeto cada usuário pertence: 'crm', 'cs' ou 'both'

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS project_scope text NOT NULL DEFAULT 'cs';

-- Definir usuários do projeto CRM (4 usuários ativos)
UPDATE profiles 
SET project_scope = 'crm' 
WHERE email IN (
  'jordantorma@dotconceito.com',
  'felipegarciamarzullo@gmail.com',
  'pedro.brigido@dotconceito.com',
  'jordantormaoliveira@gmail.com'
);

-- Criar função auxiliar para filtrar usuários por projeto
-- Retorna apenas usuários ativos do projeto especificado ou com acesso a 'both'
CREATE OR REPLACE FUNCTION get_users_by_project(project_name text)
RETURNS SETOF profiles AS $$
BEGIN
  RETURN QUERY 
  SELECT * FROM profiles 
  WHERE (project_scope = project_name OR project_scope = 'both')
    AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário para documentação
COMMENT ON COLUMN profiles.project_scope IS 'Define qual projeto o usuário pertence: crm (CRM/Vendas), cs (Customer Success/Operações) ou both (ambos)';