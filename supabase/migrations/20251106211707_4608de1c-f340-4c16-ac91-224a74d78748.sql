-- Adicionar campos de status à tabela projetos_reservados
ALTER TABLE public.projetos_reservados
ADD COLUMN inadimplente boolean NOT NULL DEFAULT false,
ADD COLUMN possivel_churn boolean NOT NULL DEFAULT false,
ADD COLUMN churn_comercial boolean NOT NULL DEFAULT false,
ADD COLUMN pausa_contratual boolean NOT NULL DEFAULT false,
ADD COLUMN aviso_previo boolean NOT NULL DEFAULT false,
ADD COLUMN churn boolean NOT NULL DEFAULT false;