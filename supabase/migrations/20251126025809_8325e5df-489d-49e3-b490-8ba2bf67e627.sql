-- Adicionar campos para transferência de propriedade nas automações
ALTER TABLE public.pipeline_automations
ADD COLUMN require_owner_transfer boolean DEFAULT false,
ADD COLUMN target_owner_role text DEFAULT null;

COMMENT ON COLUMN public.pipeline_automations.require_owner_transfer IS 'Se true, requer transferência de propriedade ao executar a automação';
COMMENT ON COLUMN public.pipeline_automations.target_owner_role IS 'Grupo de usuários (role) para o qual a propriedade deve ser transferida';