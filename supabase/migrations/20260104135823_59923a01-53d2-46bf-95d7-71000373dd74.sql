-- Create a function to atomically create workspace and add owner
CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(workspace_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id uuid;
BEGIN
  -- Insert workspace
  INSERT INTO public.workspaces (name)
  VALUES (workspace_name)
  RETURNING id INTO new_workspace_id;
  
  -- Add the current user as owner
  INSERT INTO public.members (workspace_id, user_id, role)
  VALUES (new_workspace_id, auth.uid(), 'owner');
  
  RETURN new_workspace_id;
END;
$$;