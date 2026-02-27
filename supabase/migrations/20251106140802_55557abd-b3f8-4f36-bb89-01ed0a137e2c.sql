-- Atualizar permissão de Gabriel para administrador
UPDATE public.profiles 
SET role = 'admin', updated_at = now() 
WHERE email = 'gabriel.costa@dotconceito.com';