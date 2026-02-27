-- Create prompts table for admin to manage default prompts
CREATE TABLE public.default_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.default_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Apenas admins podem gerenciar prompts padrão" 
ON public.default_prompts 
FOR ALL 
USING (get_current_user_role() = 'admin');

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_default_prompts_updated_at
BEFORE UPDATE ON public.default_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();