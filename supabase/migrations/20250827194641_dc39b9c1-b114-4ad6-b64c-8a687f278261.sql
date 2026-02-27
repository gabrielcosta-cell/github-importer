-- Fix security issue: Restrict access to monthly_goals and team_goals tables
-- Remove overly permissive policies that allow public access

-- Drop the existing overly permissive policies
DROP POLICY IF EXISTS "Everyone can view monthly goals" ON public.monthly_goals;
DROP POLICY IF EXISTS "Everyone can view team goals" ON public.team_goals;

-- Create secure policies for monthly_goals
-- Only authenticated users can view monthly goals (business metrics)
CREATE POLICY "Authenticated users can view monthly goals" 
ON public.monthly_goals 
FOR SELECT 
TO authenticated
USING (true);

-- Create secure policies for team_goals  
-- Only authenticated users can view team goals (business metrics)
CREATE POLICY "Authenticated users can view team goals" 
ON public.team_goals 
FOR SELECT 
TO authenticated
USING (true);

-- The existing admin management policies remain unchanged:
-- "Admins can manage monthly goals" and "Admins can manage team goals"