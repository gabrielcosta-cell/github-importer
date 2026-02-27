-- Criar usuário admin inicial se não existir nenhum
-- Primeiro verificar se já existe um admin
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count 
    FROM public.profiles 
    WHERE role = 'admin';
    
    -- Se não há nenhum admin, promover o primeiro usuário criado
    IF admin_count = 0 THEN
        UPDATE public.profiles 
        SET role = 'admin' 
        WHERE id = (
            SELECT id FROM public.profiles 
            ORDER BY created_at ASC 
            LIMIT 1
        );
        
        -- Se não há usuários, criar um usuário admin padrão no sistema
        IF NOT FOUND THEN
            -- Inserir perfil admin diretamente (será usado quando o primeiro usuário se registrar)
            INSERT INTO public.profiles (user_id, name, email, role)
            SELECT 
                u.id,
                COALESCE(u.raw_user_meta_data->>'name', 'Admin DOT'),
                u.email,
                'admin'
            FROM auth.users u
            WHERE u.email LIKE '%@dotconceito.com'
            LIMIT 1
            ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
        END IF;
    END IF;
END $$;

-- Atualizar dados existentes para garantir que tenham created_by
UPDATE "DOT CRM / Vendas" 
SET created_by = (
    SELECT user_id FROM public.profiles 
    WHERE role = 'admin' 
    LIMIT 1
)
WHERE created_by IS NULL;

-- Adicionar trigger para atualizar updated_at na tabela CRM
CREATE TRIGGER update_crm_vendas_updated_at
  BEFORE UPDATE ON "DOT CRM / Vendas"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();