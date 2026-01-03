import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Radar, ArrowRight, Building2, Loader2, CheckCircle } from 'lucide-react';

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const { createWorkspace } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast({
        title: 'Workspace name required',
        description: 'Please enter a name for your workspace.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const workspace = await createWorkspace(workspaceName.trim());
      if (workspace) {
        toast({
          title: 'Workspace created!',
          description: `Welcome to ${workspace.name}. Let's start building your foresight library.`,
        });
        setStep(2);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create workspace. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    navigate('/dashboard');
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-hero">
      {/* Background effects */}
      <div className="fixed inset-0 gradient-radial pointer-events-none" />
      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <Card variant="glass" className="w-full max-w-lg relative animate-slide-up">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center glow-primary">
            {step === 1 ? (
              <Building2 className="w-8 h-8 text-primary" />
            ) : (
              <CheckCircle className="w-8 h-8 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-4">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={`w-8 h-1 rounded-full transition-colors ${
                    s <= step ? 'bg-primary' : 'bg-border'
                  }`}
                />
              ))}
            </div>
            <CardTitle className="text-2xl font-display">
              {step === 1 ? 'Create Your Workspace' : 'All Set!'}
            </CardTitle>
            <CardDescription className="mt-2">
              {step === 1
                ? 'Your workspace is where your team collaborates on foresight projects.'
                : 'Your workspace is ready. Start collecting signals and building trends.'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {step === 1 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Workspace Name</label>
                <Input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="e.g., Innovation Lab, Strategy Team"
                  className="bg-secondary/50 border-border focus:border-primary"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkspace()}
                />
                <p className="text-xs text-muted-foreground">
                  You can change this later in workspace settings.
                </p>
              </div>

              <Button
                variant="glow"
                className="w-full"
                onClick={handleCreateWorkspace}
                disabled={loading || !workspaceName.trim()}
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Workspace
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Signals', value: '0', desc: 'Collected' },
                  { label: 'Trends', value: '0', desc: 'Identified' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-4 rounded-xl bg-secondary/50 text-center"
                  >
                    <div className="text-2xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label} {stat.desc}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Radar className="w-4 h-4 text-primary" />
                  Quick Start Tips
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Add your first signal using the URL scanner</li>
                  <li>• Group related signals into trends</li>
                  <li>• Visualize trends on the Radar chart</li>
                </ul>
              </div>

              <Button variant="glow" className="w-full" onClick={handleComplete}>
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
