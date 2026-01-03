import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { X, Loader2, Sparkles } from 'lucide-react';

interface QuickTrendFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickTrendForm({ onClose, onSuccess }: QuickTrendFormProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [impact, setImpact] = useState<'low' | 'medium' | 'high'>('medium');
  const [certainty, setCertainty] = useState<'certain' | 'uncertain' | 'wildcard'>('uncertain');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerateDescription = async () => {
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a trend title first.',
        variant: 'destructive',
      });
      return;
    }

    setGenerating(true);
    try {
      const response = await supabase.functions.invoke('generate-trend-description', {
        body: {
          title: title.trim(),
          signals: [], // No signals linked yet
        },
      });

      if (response.error) throw new Error(response.error.message);

      setDescription(response.data.description);
      toast({
        title: 'Description generated',
        description: 'AI has created a trend description.',
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Could not generate description.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!currentWorkspace || !user) return;

    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for this trend.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('trends').insert({
        workspace_id: currentWorkspace.id,
        title: title.trim().substring(0, 120),
        description: description.trim().substring(0, 1800) || null,
        owner_id: user.id,
        impact,
        certainty,
      });

      if (error) throw error;

      toast({
        title: 'Trend created',
        description: 'Your trend has been added to the workspace.',
      });
      onSuccess();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save failed',
        description: 'Could not create the trend. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl glass border border-border p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold">Create Trend</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Define a new trend to track
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Rise of Autonomous Everything"
              className="bg-secondary/50"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Description</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateDescription}
                disabled={generating || !title.trim()}
              >
                {generating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Generate
              </Button>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this trend, its drivers, and implications..."
              className="bg-secondary/50 min-h-[120px]"
              maxLength={1800}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Impact</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setImpact(level)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                      impact === level
                        ? level === 'low'
                          ? 'bg-success/20 text-success border border-success/30'
                          : level === 'medium'
                          ? 'bg-warning/20 text-warning border border-warning/30'
                          : 'bg-destructive/20 text-destructive border border-destructive/30'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Certainty</label>
              <div className="flex gap-2">
                {(['certain', 'uncertain', 'wildcard'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setCertainty(level)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                      certainty === level
                        ? level === 'certain'
                          ? 'bg-success/20 text-success border border-success/30'
                          : level === 'uncertain'
                          ? 'bg-warning/20 text-warning border border-warning/30'
                          : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-secondary hover:bg-secondary/80'
                    }`}
                  >
                    {level === 'wildcard' ? 'wild' : level}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="glow"
            onClick={handleSave}
            disabled={loading || !title.trim()}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Trend
          </Button>
        </div>
      </div>
    </div>
  );
}
