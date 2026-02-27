-- Habilitar RLS na tabela businesses
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários autenticados vejam todos os negócios
CREATE POLICY "Usuários autenticados podem ver negócios" 
ON public.businesses 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Política para permitir que usuários autenticados criem negócios
CREATE POLICY "Usuários autenticados podem criar negócios" 
ON public.businesses 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid()::text);

-- Política para permitir que usuários autenticados atualizem negócios que criaram
CREATE POLICY "Usuários podem atualizar seus próprios negócios" 
ON public.businesses 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND created_by = auth.uid()::text);

-- Política para permitir que usuários autenticados deletem negócios que criaram
CREATE POLICY "Usuários podem deletar seus próprios negócios" 
ON public.businesses 
FOR DELETE 
USING (auth.uid() IS NOT NULL AND created_by = auth.uid()::text);