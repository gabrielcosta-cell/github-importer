-- Criar tabela para registros de variáveis sobre investimento/vendas
CREATE TABLE IF NOT EXISTS public.crm_card_variable_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  variable_type TEXT NOT NULL CHECK (variable_type IN ('investimento', 'venda')),
  variable_value NUMERIC NOT NULL,
  variable_month INTEGER NOT NULL CHECK (variable_month >= 1 AND variable_month <= 12),
  variable_year INTEGER NOT NULL,
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_crm_card_variable_history_card_id ON public.crm_card_variable_history(card_id);
CREATE INDEX IF NOT EXISTS idx_crm_card_variable_history_date ON public.crm_card_variable_history(variable_year, variable_month);

-- Habilitar RLS
ALTER TABLE public.crm_card_variable_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can create variable history"
  ON public.crm_card_variable_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND recorded_by = auth.uid());

CREATE POLICY "Users can view variable history"
  ON public.crm_card_variable_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update variable history"
  ON public.crm_card_variable_history
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete variable history"
  ON public.crm_card_variable_history
  FOR DELETE
  USING (auth.uid() IS NOT NULL);