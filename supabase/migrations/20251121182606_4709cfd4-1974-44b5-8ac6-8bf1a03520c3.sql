-- Criar tabela para respostas CSAT
CREATE TABLE public.csat_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  telefone TEXT NOT NULL,
  nota_atendimento INTEGER NOT NULL CHECK (nota_atendimento >= 1 AND nota_atendimento <= 10),
  nota_performance INTEGER NOT NULL CHECK (nota_performance >= 1 AND nota_performance <= 10),
  nota_conteudo INTEGER NOT NULL CHECK (nota_conteudo >= 1 AND nota_conteudo <= 10),
  recomendacao INTEGER NOT NULL CHECK (recomendacao >= 0 AND recomendacao <= 10),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para respostas NPS
CREATE TABLE public.nps_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa TEXT NOT NULL,
  responsavel TEXT NOT NULL,
  email TEXT NOT NULL,
  recomendacao INTEGER NOT NULL CHECK (recomendacao >= 0 AND recomendacao <= 10),
  sentimento_sem_dot TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.csat_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

-- Políticas: permitir que qualquer um insira (formulário público)
CREATE POLICY "Qualquer um pode enviar CSAT" 
ON public.csat_responses 
FOR INSERT 
TO public
WITH CHECK (true);

CREATE POLICY "Qualquer um pode enviar NPS" 
ON public.nps_responses 
FOR INSERT 
TO public
WITH CHECK (true);

-- Políticas: apenas usuários autenticados podem visualizar
CREATE POLICY "Usuários autenticados podem ver CSAT" 
ON public.csat_responses 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuários autenticados podem ver NPS" 
ON public.nps_responses 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Criar índices para melhor performance
CREATE INDEX idx_csat_responses_created_at ON public.csat_responses(created_at DESC);
CREATE INDEX idx_nps_responses_created_at ON public.nps_responses(created_at DESC);