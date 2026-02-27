-- Create success_case_prompts table for storing prompts for Instagram post generation
CREATE TABLE public.success_case_prompts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.success_case_prompts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage prompts"
ON public.success_case_prompts
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.user_id = auth.uid()
        AND profiles.role = 'admin'
    )
);

CREATE POLICY "Authenticated users can view prompts"
ON public.success_case_prompts
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Create updated_at trigger
CREATE TRIGGER update_success_case_prompts_updated_at
BEFORE UPDATE ON public.success_case_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();