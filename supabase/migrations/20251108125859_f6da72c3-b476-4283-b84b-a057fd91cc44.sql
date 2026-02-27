-- Adicionar coluna para razão/notas na movimentação de cards
ALTER TABLE public.crm_card_stage_history
ADD COLUMN moved_by uuid REFERENCES auth.users(id),
ADD COLUMN reason text,
ADD COLUMN notes text;

-- Criar índice para melhorar performance de consultas
CREATE INDEX idx_card_stage_history_card_id ON public.crm_card_stage_history(card_id);

-- Atualizar função de rastreamento para incluir o usuário que moveu
CREATE OR REPLACE FUNCTION public.track_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Se a etapa mudou
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    -- Finalizar entrada atual
    UPDATE public.crm_card_stage_history
    SET exited_at = now()
    WHERE card_id = NEW.id
      AND stage_id = OLD.stage_id
      AND exited_at IS NULL;
    
    -- Verificar se já existe histórico para esta etapa
    IF EXISTS (
      SELECT 1 FROM public.crm_card_stage_history
      WHERE card_id = NEW.id AND stage_id = NEW.stage_id
    ) THEN
      -- Reabrir entrada existente
      UPDATE public.crm_card_stage_history
      SET entered_at = now(), exited_at = NULL, moved_by = auth.uid()
      WHERE card_id = NEW.id AND stage_id = NEW.stage_id;
    ELSE
      -- Criar nova entrada
      INSERT INTO public.crm_card_stage_history (card_id, stage_id, entered_at, moved_by)
      VALUES (NEW.id, NEW.stage_id, now(), auth.uid());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;