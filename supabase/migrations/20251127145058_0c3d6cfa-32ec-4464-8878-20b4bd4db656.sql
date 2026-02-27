-- Criar tabela para anexos de atividades (se não existir)
CREATE TABLE IF NOT EXISTS crm_activity_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES crm_activities(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE crm_activity_attachments ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view activity attachments" ON crm_activity_attachments;
DROP POLICY IF EXISTS "Users can create activity attachments" ON crm_activity_attachments;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON crm_activity_attachments;

-- Policies para anexos
CREATE POLICY "Users can view activity attachments"
ON crm_activity_attachments FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create activity attachments"
ON crm_activity_attachments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND uploaded_by = auth.uid());

CREATE POLICY "Users can delete their own attachments"
ON crm_activity_attachments FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid() OR get_current_user_role() = 'admin');

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_activity_attachments_activity_id ON crm_activity_attachments(activity_id);

-- Criar índice para parent_activity_id se não existir
CREATE INDEX IF NOT EXISTS idx_crm_activities_parent_id ON crm_activities(parent_activity_id);