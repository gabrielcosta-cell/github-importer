-- Adicionar coluna cnpj na tabela cancellation_requests
ALTER TABLE public.cancellation_requests
ADD COLUMN cnpj TEXT;