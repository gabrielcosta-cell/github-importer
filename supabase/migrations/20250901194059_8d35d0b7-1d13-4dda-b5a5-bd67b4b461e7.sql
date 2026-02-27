-- Atualizar política de SELECT para permitir que usuários autenticados vejam negócios
DROP POLICY IF EXISTS "businesses_secure_select" ON public.businesses;

CREATE POLICY "businesses_secure_select" 
ON public.businesses 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Permitir que closers e SDRs também possam atualizar negócios
DROP POLICY IF EXISTS "businesses_secure_update" ON public.businesses;

CREATE POLICY "businesses_secure_update" 
ON public.businesses 
FOR UPDATE 
USING (
  (get_current_user_role() = 'admin'::text) OR 
  (created_by = auth.uid()) OR 
  (get_current_user_role() IN ('closer', 'sdr'))
);