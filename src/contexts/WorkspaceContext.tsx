import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface Workspace {
  id: string;
  name: string;
  plan: string;
  created_at: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  loading: boolean;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = data as Workspace[];
      setWorkspaces(typedData);
      
      // Set first workspace as current if none selected
      if (typedData.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(typedData[0]);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (name: string): Promise<Workspace | null> => {
    if (!user) return null;

    try {
      // Use atomic function to create workspace and add owner
      const { data: workspaceId, error: createError } = await supabase
        .rpc('create_workspace_with_owner', { workspace_name: name });

      if (createError) throw createError;

      // Fetch the created workspace (user is now a member)
      const { data: workspace, error: fetchError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (fetchError) throw fetchError;

      const typedWorkspace = workspace as Workspace;
      await fetchWorkspaces();
      setCurrentWorkspace(typedWorkspace);
      return typedWorkspace;
    } catch (error) {
      console.error('Error creating workspace:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, [user]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        loading,
        createWorkspace,
        refreshWorkspaces: fetchWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
