-- Add DELETE policy for success_cases table
CREATE POLICY "Admins can delete cases"
ON public.success_cases
FOR DELETE
USING (get_current_user_role() = 'admin');

-- Also allow creators to delete their own cases
CREATE POLICY "Users can delete their own cases"
ON public.success_cases
FOR DELETE
USING (auth.uid() = created_by);