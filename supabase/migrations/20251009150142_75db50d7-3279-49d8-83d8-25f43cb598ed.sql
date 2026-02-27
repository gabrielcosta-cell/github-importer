-- Remover a política RLS restritiva existente
DROP POLICY IF EXISTS "crm_cards_secure_select" ON public.crm_cards;

-- Criar nova política que permite usuários autenticados verem todos os cards
CREATE POLICY "Authenticated users can view all cards"
ON public.crm_cards
FOR SELECT
USING (auth.uid() IS NOT NULL);