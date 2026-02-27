-- Create table for upsell history
CREATE TABLE IF NOT EXISTS public.crm_card_upsell_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  upsell_value NUMERIC NOT NULL DEFAULT 0,
  upsell_month INTEGER NOT NULL,
  upsell_year INTEGER NOT NULL,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  CONSTRAINT valid_month CHECK (upsell_month >= 1 AND upsell_month <= 12),
  CONSTRAINT valid_year CHECK (upsell_year >= 2020 AND upsell_year <= 2100)
);

-- Create index for faster queries
CREATE INDEX idx_crm_card_upsell_history_card_id ON public.crm_card_upsell_history(card_id);
CREATE INDEX idx_crm_card_upsell_history_month_year ON public.crm_card_upsell_history(upsell_month, upsell_year);

-- Enable RLS
ALTER TABLE public.crm_card_upsell_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view upsell history"
  ON public.crm_card_upsell_history
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create upsell history"
  ON public.crm_card_upsell_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND recorded_by = auth.uid());

CREATE POLICY "Users can update upsell history"
  ON public.crm_card_upsell_history
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete upsell history"
  ON public.crm_card_upsell_history
  FOR DELETE
  USING (auth.uid() IS NOT NULL);