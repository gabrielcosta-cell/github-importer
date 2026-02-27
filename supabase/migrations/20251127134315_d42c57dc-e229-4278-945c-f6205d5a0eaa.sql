-- Create table for CSM card performance history
CREATE TABLE IF NOT EXISTS public.crm_card_performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  performance_type TEXT NOT NULL CHECK (performance_type IN (
    'receita_gerada',
    'investimento_midia',
    'teve_vendas',
    'quantidade_vendas',
    'teve_roas',
    'teve_roi'
  )),
  performance_value TEXT NOT NULL,
  performance_month INTEGER NOT NULL CHECK (performance_month >= 1 AND performance_month <= 12),
  performance_year INTEGER NOT NULL CHECK (performance_year >= 2000 AND performance_year <= 2100),
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(card_id, performance_type, performance_month, performance_year)
);

-- Enable RLS
ALTER TABLE public.crm_card_performance_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view performance history"
  ON public.crm_card_performance_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create performance history"
  ON public.crm_card_performance_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND recorded_by = auth.uid());

CREATE POLICY "Users can update performance history"
  ON public.crm_card_performance_history
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete performance history"
  ON public.crm_card_performance_history
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_performance_history_card_id ON public.crm_card_performance_history(card_id);
CREATE INDEX idx_performance_history_date ON public.crm_card_performance_history(performance_year, performance_month);

-- Create trigger for updated_at
CREATE TRIGGER update_crm_card_performance_history_updated_at
  BEFORE UPDATE ON public.crm_card_performance_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();