-- Add new columns to approval_jobs table
ALTER TABLE public.approval_jobs
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS workflow text DEFAULT 'aprovacao_publicacao',
ADD COLUMN IF NOT EXISTS approval_deadline timestamp with time zone,
ADD COLUMN IF NOT EXISTS attached_files jsonb DEFAULT '[]'::jsonb;

-- Create approval_job_history table
CREATE TABLE IF NOT EXISTS public.approval_job_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.approval_jobs(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  action_description text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on approval_job_history
ALTER TABLE public.approval_job_history ENABLE ROW LEVEL SECURITY;

-- Create policies for approval_job_history
CREATE POLICY "Users can view job history"
  ON public.approval_job_history
  FOR SELECT
  USING (
    (get_current_user_role() = 'admin') OR
    user_has_module_permission(auth.uid(), 'aprovacao', 'view')
  );

CREATE POLICY "Users can create job history"
  ON public.approval_job_history
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    created_by = auth.uid() AND
    user_has_module_permission(auth.uid(), 'aprovacao', 'create')
  );

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_approval_job_history_job_id ON public.approval_job_history(job_id);
CREATE INDEX IF NOT EXISTS idx_approval_job_history_created_at ON public.approval_job_history(created_at DESC);