-- Adicionar campo email à tabela csat_responses
ALTER TABLE public.csat_responses 
ADD COLUMN IF NOT EXISTS email text;

-- Tornar telefone opcional (já que o formulário agora usa email)
ALTER TABLE public.csat_responses 
ALTER COLUMN telefone DROP NOT NULL;

-- Atualizar telefone existentes para serem null se estiverem vazios
UPDATE public.csat_responses SET telefone = NULL WHERE telefone = '';

-- Tornar nota_conteudo e recomendacao com valores default (foram removidos do formulário)
ALTER TABLE public.csat_responses 
ALTER COLUMN nota_conteudo SET DEFAULT 0,
ALTER COLUMN recomendacao SET DEFAULT 0;