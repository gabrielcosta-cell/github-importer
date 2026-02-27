-- Remover constraint do campo nota_conteudo que não é mais usado
ALTER TABLE public.csat_responses DROP CONSTRAINT csat_responses_nota_conteudo_check;

-- Atualizar constraints para escala 1-5 (conforme novo formulário)
ALTER TABLE public.csat_responses DROP CONSTRAINT csat_responses_nota_atendimento_check;
ALTER TABLE public.csat_responses ADD CONSTRAINT csat_responses_nota_atendimento_check CHECK (nota_atendimento >= 1 AND nota_atendimento <= 5);

ALTER TABLE public.csat_responses DROP CONSTRAINT csat_responses_nota_performance_check;
ALTER TABLE public.csat_responses ADD CONSTRAINT csat_responses_nota_performance_check CHECK (nota_performance >= 1 AND nota_performance <= 5);