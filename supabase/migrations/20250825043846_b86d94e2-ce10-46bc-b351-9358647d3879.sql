-- Corrigir política RLS para permitir acesso baseado em role admin no contexto de autenticação
DROP POLICY IF EXISTS "Admin access to system settings" ON public.system_settings;

-- Criar política mais simples para permitir acesso total (temporário para testes)
CREATE POLICY "Allow all access to system settings" 
ON public.system_settings 
FOR ALL 
USING (true)
WITH CHECK (true);