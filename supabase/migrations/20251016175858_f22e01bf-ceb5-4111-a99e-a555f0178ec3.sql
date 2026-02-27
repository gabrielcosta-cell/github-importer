-- Adicionar campo share_token para links públicos de aprovação
ALTER TABLE approval_jobs
ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Criar índice para melhorar performance de busca por token
CREATE INDEX IF NOT EXISTS idx_approval_jobs_share_token ON approval_jobs(share_token);

-- Criar tabela para armazenar feedback dos clientes
CREATE TABLE IF NOT EXISTS approval_client_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES approval_jobs(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  client_name TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE approval_client_feedback ENABLE ROW LEVEL SECURITY;

-- Permitir que qualquer pessoa (sem autenticação) insira feedback
CREATE POLICY "Anyone can submit feedback"
ON approval_client_feedback
FOR INSERT
WITH CHECK (true);

-- Usuários autenticados com permissão podem ver feedback
CREATE POLICY "Users can view feedback"
ON approval_client_feedback
FOR SELECT
USING (
  get_current_user_role() = 'admin' OR
  user_has_module_permission(auth.uid(), 'aprovacao', 'view')
);

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_approval_client_feedback_job_id ON approval_client_feedback(job_id);