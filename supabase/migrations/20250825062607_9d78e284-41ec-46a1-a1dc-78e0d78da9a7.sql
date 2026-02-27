-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- Create a proper insert policy for the edge function
CREATE POLICY "Allow service role to insert profiles" 
ON public.profiles 
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Allow authenticated users (edge functions) to insert profiles
CREATE POLICY "Allow authenticated inserts for profiles" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (true);