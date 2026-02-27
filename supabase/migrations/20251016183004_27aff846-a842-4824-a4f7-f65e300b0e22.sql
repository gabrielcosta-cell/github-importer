-- Add approval_status column to approval_client_feedback
ALTER TABLE public.approval_client_feedback
ADD COLUMN approval_status text CHECK (approval_status IN ('aprovado', 'revisao'));

COMMENT ON COLUMN public.approval_client_feedback.approval_status IS 'Status de aprovação: aprovado ou revisao';