import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import { SignalsPage } from '@/components/signals/SignalsPage';
import { TrendRadar } from '@/components/visualizations/TrendRadar';
import { NetworkGraph } from '@/components/visualizations/NetworkGraph';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const { workspaces, loading: workspaceLoading, currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Route to correct content based on path
  const renderContent = () => {
    switch (location.pathname) {
      case '/signals':
        return <SignalsPage />;
      case '/radar':
        return <TrendRadar />;
      case '/network':
        return <NetworkGraph />;
      case '/trends':
        return <DashboardContent />; // TODO: Dedicated trends page
      default:
        return <DashboardContent />;
    }
  };

  return (
    <DashboardLayout>
      {renderContent()}
    </DashboardLayout>
  );
}
