-- Tabela para armazenar as copies de Instagram geradas para cases
CREATE TABLE public.success_case_copies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  input_context TEXT NOT NULL,
  ai_response TEXT,
  ai_provider TEXT DEFAULT 'claude',
  status TEXT DEFAULT 'pending',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.success_case_copies ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage copies" 
ON public.success_case_copies 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Authenticated users can view copies" 
ON public.success_case_copies 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create copies" 
ON public.success_case_copies 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);