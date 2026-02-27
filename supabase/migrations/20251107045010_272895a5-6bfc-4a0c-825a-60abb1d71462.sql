-- Criar tabela de histórico de movimentações de cards
CREATE TABLE IF NOT EXISTS public.crm_card_stage_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.crm_stages(id) ON DELETE CASCADE,
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para melhorar performance
CREATE INDEX idx_crm_card_stage_history_card_id ON public.crm_card_stage_history(card_id);
CREATE INDEX idx_crm_card_stage_history_stage_id ON public.crm_card_stage_history(stage_id);
CREATE INDEX idx_crm_card_stage_history_entered_at ON public.crm_card_stage_history(entered_at);

-- Habilitar RLS
ALTER TABLE public.crm_card_stage_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view stage history"
  ON public.crm_card_stage_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can insert stage history"
  ON public.crm_card_stage_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "System can update stage history"
  ON public.crm_card_stage_history
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Função para registrar entrada em nova etapa quando card é criado
CREATE OR REPLACE FUNCTION public.create_initial_stage_history()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.crm_card_stage_history (card_id, stage_id, entered_at)
  VALUES (NEW.id, NEW.stage_id, NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para registrar mudanças de etapa
CREATE OR REPLACE FUNCTION public.track_stage_change()
RETURNS TRIGGER AS $$
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
      SET entered_at = now(), exited_at = NULL
      WHERE card_id = NEW.id AND stage_id = NEW.stage_id;
    ELSE
      -- Criar nova entrada
      INSERT INTO public.crm_card_stage_history (card_id, stage_id, entered_at)
      VALUES (NEW.id, NEW.stage_id, now());
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers
CREATE TRIGGER create_initial_stage_history_trigger
  AFTER INSERT ON public.crm_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.create_initial_stage_history();

CREATE TRIGGER track_stage_change_trigger
  AFTER UPDATE ON public.crm_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.track_stage_change();

-- Comentários
COMMENT ON TABLE public.crm_card_stage_history IS 'Histórico de movimentações de cards entre etapas do pipeline';
COMMENT ON COLUMN public.crm_card_stage_history.entered_at IS 'Data/hora que o card entrou na etapa';
COMMENT ON COLUMN public.crm_card_stage_history.exited_at IS 'Data/hora que o card saiu da etapa (NULL se ainda está nela)';