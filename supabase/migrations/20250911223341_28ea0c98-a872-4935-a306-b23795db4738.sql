-- Criar tabela para listas especiais (ganhos e perdidos)
CREATE TABLE public.crm_special_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_card_id UUID NOT NULL,
  card_title TEXT NOT NULL,
  company_name TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  value NUMERIC DEFAULT 0,
  monthly_revenue NUMERIC DEFAULT 0,
  implementation_value NUMERIC DEFAULT 0,
  niche TEXT,
  description TEXT,
  list_type TEXT NOT NULL CHECK (list_type IN ('ganho', 'perdido')),
  pipeline_id UUID NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_special_lists ENABLE ROW LEVEL SECURITY;

-- Create policies for crm_special_lists
CREATE POLICY "Authenticated users can view special lists" 
ON public.crm_special_lists 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create special list entries" 
ON public.crm_special_lists 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update special list entries" 
ON public.crm_special_lists 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete special list entries" 
ON public.crm_special_lists 
FOR DELETE 
USING ((get_current_user_role() = 'admin'::text) OR (created_by = auth.uid()));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_crm_special_lists_updated_at
BEFORE UPDATE ON public.crm_special_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();