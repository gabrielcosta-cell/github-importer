-- Corrigir problema de segurança: Habilitar RLS na tabela de backup
-- A tabela businesses_backup_20250829 contém dados sensíveis de negócios mas não tem RLS habilitado

-- Habilitar Row Level Security na tabela de backup
ALTER TABLE public.businesses_backup_20250829 ENABLE ROW LEVEL SECURITY;

-- Criar política restritiva: apenas administradores podem acessar dados de backup
CREATE POLICY "Apenas admins podem acessar backup de negócios" 
ON public.businesses_backup_20250829 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Adicionar comentário para documentar o propósito da tabela
COMMENT ON TABLE public.businesses_backup_20250829 IS 'Tabela de backup dos negócios criada em 29/08/2025. Acesso restrito a administradores apenas.';