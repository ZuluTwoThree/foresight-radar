-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;

-- Create a permissive INSERT policy for workspaces
CREATE POLICY "Authenticated users can create workspaces" 
ON public.workspaces 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);