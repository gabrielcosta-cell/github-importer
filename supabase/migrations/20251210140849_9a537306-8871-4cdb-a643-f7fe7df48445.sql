-- Add DELETE policy for admins on csat_responses table
CREATE POLICY "Admins podem deletar respostas CSAT"
ON public.csat_responses
FOR DELETE
USING (get_current_user_role() = 'admin'::text);

-- Add UPDATE policy for admins on csat_responses table
CREATE POLICY "Admins podem atualizar respostas CSAT"
ON public.csat_responses
FOR UPDATE
USING (get_current_user_role() = 'admin'::text);