-- Criar tabela para templates de comemoração
CREATE TABLE public.celebration_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.celebration_templates ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para celebration_templates
CREATE POLICY "Admins can manage celebration templates" 
ON public.celebration_templates 
FOR ALL 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Users can view active celebration templates" 
ON public.celebration_templates 
FOR SELECT 
USING (is_active = true);

-- Adicionar coluna selected_celebration_id na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN selected_celebration_id UUID REFERENCES public.celebration_templates(id);

-- Trigger para updated_at
CREATE TRIGGER update_celebration_templates_updated_at
BEFORE UPDATE ON public.celebration_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();