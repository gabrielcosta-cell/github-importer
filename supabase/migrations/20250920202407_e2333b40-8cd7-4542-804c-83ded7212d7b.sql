-- Adicionar módulo copy
INSERT INTO public.modules (name, display_name, description, icon) 
VALUES ('copy', 'Copy', 'Formulário para coleta de informações para criação de copy', 'FileText');

-- Criar tabela para formulários de copy
CREATE TABLE public.copy_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Transcrições das reuniões
  reuniao_boas_vindas TEXT,
  reuniao_kick_off TEXT,
  reuniao_brainstorm TEXT,
  
  -- Informações do cliente
  nome_empresa TEXT,
  nicho_empresa TEXT,
  servicos_produtos TEXT,
  diferencial_competitivo TEXT,
  publico_alvo TEXT,
  principal_inimigo TEXT,
  avatar_principal TEXT,
  momento_jornada TEXT,
  maior_objecao TEXT,
  cases_impressionantes TEXT,
  nomes_empresas TEXT,
  investimento_medio TEXT,
  pergunta_qualificatoria TEXT,
  informacao_extra TEXT,
  numeros_certificados TEXT
);

-- Habilitar RLS
ALTER TABLE public.copy_forms ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Authenticated users can view copy forms" 
ON public.copy_forms 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create copy forms" 
ON public.copy_forms 
FOR INSERT 
WITH CHECK ((auth.uid() IS NOT NULL) AND (created_by = auth.uid()));

CREATE POLICY "Users can update copy forms" 
ON public.copy_forms 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete copy forms" 
ON public.copy_forms 
FOR DELETE 
USING (get_current_user_role() = 'admin');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_copy_forms_updated_at
BEFORE UPDATE ON public.copy_forms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();