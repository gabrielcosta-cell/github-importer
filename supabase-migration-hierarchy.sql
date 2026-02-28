-- Migration: Reestruturar Hierarquia de Usuários (3 Níveis)
-- Execute este SQL no Supabase SQL Editor

-- 1. Adicionar campo is_global_admin
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_global_admin boolean DEFAULT false;

-- 2. Marcar Gabriel Costa como Admin Global (buscar pelo email ou nome)
UPDATE profiles SET is_global_admin = true WHERE email = 'gabriel@dotconceito.com';
-- Se o email for diferente, use: UPDATE profiles SET is_global_admin = true WHERE name = 'Gabriel Costa';

-- 3. Migrar roles SDR/Closer para 'user'
UPDATE profiles SET role = 'user' WHERE role IN ('sdr', 'closer');

-- 4. Garantir que admins mantêm role 'admin'
-- (já devem estar corretos, mas por segurança)
UPDATE profiles SET role = 'admin' WHERE role = 'admin';

-- 5. Limpar custom_role_id de todos os usuários (hierarquia agora é fixa)
-- UPDATE profiles SET custom_role_id = null;
-- ^ Descomente se quiser remover todos os custom roles dos usuários
