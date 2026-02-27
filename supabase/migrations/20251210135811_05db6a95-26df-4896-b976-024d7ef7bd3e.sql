-- Add DELETE policy for admins on nps_responses table
CREATE POLICY "Admins podem deletar respostas NPS"
ON public.nps_responses
FOR DELETE
USING (get_current_user_role() = 'admin'::text);

-- Add UPDATE policy for admins on nps_responses table
CREATE POLICY "Admins podem atualizar respostas NPS"
ON public.nps_responses
FOR UPDATE
USING (get_current_user_role() = 'admin'::text);