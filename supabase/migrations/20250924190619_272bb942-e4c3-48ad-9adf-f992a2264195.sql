-- Atualizar política de SELECT para default_prompts
-- Permitir que usuários com permissões de edit + delete no módulo copy vejam os prompts

DROP POLICY IF EXISTS "Apenas admins podem gerenciar prompts padrão" ON default_prompts;
DROP POLICY IF EXISTS "Admins can manage default prompts" ON default_prompts;

-- Política para SELECT: usuários com edit + delete no copy podem ver prompts
CREATE POLICY "Users with copy edit+delete permissions can view prompts" 
ON default_prompts 
FOR SELECT 
USING (
  get_current_user_role() = 'admin' 
  OR 
  user_has_module_permission(auth.uid(), 'copy', 'edit') 
  AND user_has_module_permission(auth.uid(), 'copy', 'delete')
);

-- Política para INSERT/UPDATE/DELETE: apenas admins
CREATE POLICY "Only admins can manage prompts" 
ON default_prompts 
FOR ALL 
USING (get_current_user_role() = 'admin')
WITH CHECK (get_current_user_role() = 'admin');