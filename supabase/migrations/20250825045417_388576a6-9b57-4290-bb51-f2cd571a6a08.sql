-- Corrigir erro do trigger que já existe
DROP TRIGGER IF EXISTS update_crm_vendas_updated_at ON "DOT CRM / Vendas";

-- Criar usuário admin inicial se não existir nenhum
DO $$
DECLARE
    admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO admin_count 
    FROM public.profiles 
    WHERE role = 'admin';
    
    -- Se não há nenhum admin, promover o primeiro usuário criado ou usuário @dotconceito.com
    IF admin_count = 0 THEN
        -- Primeiro tentar promover usuário @dotconceito.com
        UPDATE public.profiles 
        SET role = 'admin' 
        WHERE user_id IN (
            SELECT u.id FROM auth.users u
            WHERE u.email LIKE '%@dotconceito.com'
            LIMIT 1
        );
        
        -- Se não encontrou, promover o primeiro usuário criado
        IF NOT FOUND THEN
            UPDATE public.profiles 
            SET role = 'admin' 
            WHERE id = (
                SELECT id FROM public.profiles 
                ORDER BY created_at ASC 
                LIMIT 1
            );
        END IF;
    END IF;
END $$;

-- Atualizar dados existentes na tabela CRM para garantir que tenham created_by
UPDATE "DOT CRM / Vendas" 
SET created_by = (
    SELECT user_id FROM public.profiles 
    WHERE role = 'admin' 
    ORDER BY created_at ASC
    LIMIT 1
)
WHERE created_by IS NULL;

-- Recriar trigger para atualizar updated_at na tabela CRM
CREATE TRIGGER update_crm_vendas_updated_at
  BEFORE UPDATE ON "DOT CRM / Vendas"
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();