-- Create pipeline_automations table
CREATE TABLE IF NOT EXISTS public.pipeline_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('won', 'lost')),
  target_pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_pipeline_automations_source ON public.pipeline_automations(source_pipeline_id, trigger_event, is_active);

-- Enable RLS
ALTER TABLE public.pipeline_automations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view pipeline automations"
  ON public.pipeline_automations
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create pipeline automations"
  ON public.pipeline_automations
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update pipeline automations"
  ON public.pipeline_automations
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete pipeline automations"
  ON public.pipeline_automations
  FOR DELETE
  USING (auth.uid() IS NOT NULL);