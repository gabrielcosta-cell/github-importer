-- Adicionar coluna event_type na tabela crm_card_stage_history para diferenciar tipos de eventos
ALTER TABLE public.crm_card_stage_history 
ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'stage_change'::text;

-- Criar índice para melhor performance nas consultas por event_type
CREATE INDEX IF NOT EXISTS idx_crm_card_stage_history_event_type 
ON public.crm_card_stage_history(event_type);

-- Inserir registros de criação para todos os cards existentes
-- Usar a data de criação do card como entered_at
INSERT INTO public.crm_card_stage_history (card_id, stage_id, entered_at, exited_at, moved_by, notes, event_type, created_at)
SELECT 
  c.id as card_id,
  c.stage_id,
  c.created_at as entered_at,
  NULL as exited_at,
  c.created_by as moved_by,
  'Card criado' as notes,
  'card_created' as event_type,
  c.created_at as created_at
FROM public.crm_cards c
WHERE NOT EXISTS (
  SELECT 1 FROM public.crm_card_stage_history h
  WHERE h.card_id = c.id 
  AND h.event_type = 'card_created'
)
ORDER BY c.created_at;

-- Atualizar a função create_initial_stage_history para incluir evento de criação
CREATE OR REPLACE FUNCTION public.create_initial_stage_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Inserir evento de criação do card
  INSERT INTO public.crm_card_stage_history (card_id, stage_id, entered_at, moved_by, notes, event_type)
  VALUES (NEW.id, NEW.stage_id, NEW.created_at, NEW.created_by, 'Card criado', 'card_created');
  
  -- Inserir entrada inicial na etapa
  INSERT INTO public.crm_card_stage_history (card_id, stage_id, entered_at, moved_by, event_type)
  VALUES (NEW.id, NEW.stage_id, NEW.created_at, NEW.created_by, 'stage_change');
  
  RETURN NEW;
END;
$function$;