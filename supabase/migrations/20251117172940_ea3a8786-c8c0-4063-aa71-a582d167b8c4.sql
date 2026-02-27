-- Create table for multiple emails per card
CREATE TABLE IF NOT EXISTS public.crm_card_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES public.crm_cards(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Create index for faster queries
CREATE INDEX idx_crm_card_emails_card_id ON public.crm_card_emails(card_id);
CREATE INDEX idx_crm_card_emails_email ON public.crm_card_emails(email);

-- Enable RLS
ALTER TABLE public.crm_card_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view card emails"
  ON public.crm_card_emails FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create card emails"
  ON public.crm_card_emails FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update card emails"
  ON public.crm_card_emails FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete card emails"
  ON public.crm_card_emails FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Migrate existing emails to new table
INSERT INTO public.crm_card_emails (card_id, email, is_primary, created_by)
SELECT 
  id as card_id,
  contact_email as email,
  true as is_primary,
  created_by
FROM public.crm_cards
WHERE contact_email IS NOT NULL AND contact_email != '';

-- Add updated_at trigger
CREATE TRIGGER update_crm_card_emails_updated_at
  BEFORE UPDATE ON public.crm_card_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();