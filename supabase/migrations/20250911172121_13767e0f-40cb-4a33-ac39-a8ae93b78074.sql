-- Create table for lead activities (comments, calls, meetings, etc.)
CREATE TABLE public.crm_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('comment', 'call', 'email', 'meeting', 'task')),
  title TEXT,
  description TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE,
  completed_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for activities
CREATE POLICY "Authenticated users can view activities"
ON public.crm_activities
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create activities"
ON public.crm_activities
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Users can update activities"
ON public.crm_activities
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete activities"
ON public.crm_activities
FOR DELETE
USING (created_by = auth.uid() OR get_current_user_role() = 'admin');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_crm_activities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_crm_activities_updated_at
BEFORE UPDATE ON public.crm_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_crm_activities_updated_at();