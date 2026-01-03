import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: workspaceLoading, currentWorkspace } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || workspaceLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show onboarding if no workspaces
  if (workspaces.length === 0) {
    return <OnboardingWizard />;
  }

  return (
    <DashboardLayout>
      <DashboardContent />
    </DashboardLayout>
  );
}
