-- Criar tabela para documentos padrão do sistema
CREATE TABLE public.default_briefing_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.default_briefing_documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - apenas admins podem gerenciar
CREATE POLICY "Apenas admins podem visualizar documentos padrão" 
ON public.default_briefing_documents 
FOR SELECT 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Apenas admins podem inserir documentos padrão" 
ON public.default_briefing_documents 
FOR INSERT 
WITH CHECK (get_current_user_role() = 'admin' AND uploaded_by = auth.uid());

CREATE POLICY "Apenas admins podem atualizar documentos padrão" 
ON public.default_briefing_documents 
FOR UPDATE 
USING (get_current_user_role() = 'admin');

CREATE POLICY "Apenas admins podem deletar documentos padrão" 
ON public.default_briefing_documents 
FOR DELETE 
USING (get_current_user_role() = 'admin');

-- Trigger para updated_at
CREATE TRIGGER update_default_briefing_documents_updated_at
BEFORE UPDATE ON public.default_briefing_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();