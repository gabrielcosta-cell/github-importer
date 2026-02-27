-- Dar permissões básicas para usuários SDR e Closer visualizarem módulos essenciais
-- Inserir permissões para usuários que não têm nenhuma configurada

DO $$
DECLARE
    user_record RECORD;
    wallet_module_id UUID;
    profile_module_id UUID;
    projetos_module_id UUID;
BEGIN
    -- Obter IDs dos módulos
    SELECT id INTO wallet_module_id FROM modules WHERE name = 'wallet';
    SELECT id INTO profile_module_id FROM modules WHERE name = 'profile';
    SELECT id INTO projetos_module_id FROM modules WHERE name = 'projetos';
    
    -- Para cada usuário não-admin que não tem permissões configuradas
    FOR user_record IN 
        SELECT p.user_id, p.name, p.role 
        FROM profiles p 
        WHERE p.role != 'admin' 
        AND p.user_id NOT IN (
            SELECT DISTINCT user_id 
            FROM user_module_permissions 
            WHERE user_id IS NOT NULL
        )
    LOOP
        -- Dar acesso ao perfil (view e edit)
        INSERT INTO user_module_permissions (user_id, module_id, can_view, can_edit, can_create, can_delete)
        VALUES (user_record.user_id, profile_module_id, true, true, false, false);
        
        -- Dar acesso à wallet (apenas view)
        INSERT INTO user_module_permissions (user_id, module_id, can_view, can_edit, can_create, can_delete)
        VALUES (user_record.user_id, wallet_module_id, true, false, false, false);
        
        -- Dar acesso aos projetos reservados (view e create)
        INSERT INTO user_module_permissions (user_id, module_id, can_view, can_edit, can_create, can_delete)
        VALUES (user_record.user_id, projetos_module_id, true, true, true, false);
        
        RAISE NOTICE 'Permissões criadas para usuário: %', user_record.name;
    END LOOP;
    
    -- Atualizar permissões existentes para usuários que têm wallet com can_view = false
    UPDATE user_module_permissions 
    SET can_view = true 
    WHERE module_id = wallet_module_id 
    AND can_view = false;
    
END $$;