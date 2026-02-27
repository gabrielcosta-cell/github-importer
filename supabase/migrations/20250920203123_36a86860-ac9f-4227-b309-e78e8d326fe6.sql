-- Adicionar campos para resposta da IA na tabela copy_forms
ALTER TABLE public.copy_forms ADD COLUMN ai_response TEXT;
ALTER TABLE public.copy_forms ADD COLUMN ai_provider TEXT;
ALTER TABLE public.copy_forms ADD COLUMN response_generated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.copy_forms ADD COLUMN status TEXT DEFAULT 'pending';