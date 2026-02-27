-- Permitir que admins possam editar etiquetas do sistema
DROP POLICY IF EXISTS "Users can update their own tags" ON public.crm_tags;

CREATE POLICY "Users can update their own tags or admins can update any" 
ON public.crm_tags 
FOR UPDATE 
USING (
  (auth.uid() IS NOT NULL) AND 
  (
    -- Admins podem editar qualquer etiqueta
    get_current_user_role() = 'admin' OR
    -- Usuários podem editar suas próprias etiquetas
    created_by = auth.uid() OR
    -- Ou qualquer etiqueta não-sistema
    is_system = false
  )
);