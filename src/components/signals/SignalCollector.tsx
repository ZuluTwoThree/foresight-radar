import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  X,
  Link as LinkIcon,
  Loader2,
  Sparkles,
  FileText,
  Check,
  Download,
} from 'lucide-react';

interface SignalCollectorProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface AISummary {
  summary: string;
  takeaways: string[];
  tags: string[];
  relevance: number;
  horizon: '0_5' | '5_10' | '10_plus';
  certainty: 'certain' | 'uncertain' | 'wildcard';
}

export function SignalCollector({ onClose, onSuccess }: SignalCollectorProps) {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<'url' | 'manual'>('url');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [aiResult, setAiResult] = useState<AISummary | null>(null);

  const handleFetchUrl = async () => {
    if (!url.trim()) {
      toast({
        title: 'URL required',
        description: 'Please enter a URL to fetch.',
        variant: 'destructive',
      });
      return;
    }

    setFetching(true);
    try {
      const response = await supabase.functions.invoke('firecrawl-scrape', {
        body: { url: url.trim() },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const data = response.data;
      if (!data.success && data.error) {
        throw new Error(data.error);
      }

      // Extract content from response (handle both data.data.markdown and data.markdown)
      const markdown = data.data?.markdown || data.markdown || '';
      const pageTitle = data.data?.metadata?.title || data.metadata?.title || '';

      if (!markdown) {
        throw new Error('No content could be extracted from this URL');
      }

      setContent(markdown);
      if (!title.trim() && pageTitle) {
        setTitle(pageTitle);
      }

      toast({
        title: 'Content fetched',
        description: `Retrieved ${markdown.length.toLocaleString()} characters from the URL.`,
      });
    } catch (error) {
      console.error('Fetch error:', error);
      toast({
        title: 'Fetch failed',
        description: error instanceof Error ? error.message : 'Could not fetch URL content.',
        variant: 'destructive',
      });
    } finally {
      setFetching(false);
    }
  };

  const handleAnalyze = async () => {
    if (!content.trim()) {
      toast({
        title: 'Content required',
        description: 'Please fetch URL content or paste text to analyze.',
        variant: 'destructive',
      });
      return;
    }

    if (content.trim().length < 100) {
      toast({
        title: 'Content too short',
        description: 'Please provide at least 100 characters of content for meaningful analysis.',
        variant: 'destructive',
      });
      return;
    }

    setAnalyzing(true);
    try {
      const response = await supabase.functions.invoke('summarize-signal', {
        body: {
          content: content.trim(),
          title: title || undefined,
          url: url || undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      setAiResult(response.data);
      toast({
        title: 'Analysis complete',
        description: 'AI has summarized and classified your signal.',
      });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Could not analyze content.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!currentWorkspace || !user) return;

    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for this signal.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const signalData = {
        workspace_id: currentWorkspace.id,
        title: title.trim().substring(0, 180),
        url: url.trim() || null,
        content: content.trim() || null,
        summary: aiResult?.summary || null,
        ai_tags: aiResult?.tags || [],
        relevance: aiResult?.relevance || 50,
        horizon: aiResult?.horizon || '5_10',
        certainty: aiResult?.certainty || 'uncertain',
        created_by: user.id,
        fetched_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('signals').insert(signalData);

      if (error) throw error;

      toast({
        title: 'Signal saved',
        description: 'Your signal has been added to the workspace.',
      });
      onSuccess();
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save failed',
        description: 'Could not save the signal. Please try again.',
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
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl glass border border-border p-6 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl font-semibold">Collect Signal</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Add a new signal to your foresight library
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={mode === 'url' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('url')}
          >
            <LinkIcon className="w-4 h-4" />
            From URL
          </Button>
          <Button
            variant={mode === 'manual' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('manual')}
          >
            <FileText className="w-4 h-4" />
            Manual Entry
          </Button>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., AI advances in autonomous vehicles"
              className="bg-secondary/50"
              maxLength={180}
            />
          </div>

          {mode === 'url' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">URL</label>
              <div className="flex gap-2">
                <Input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="bg-secondary/50 flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleFetchUrl}
                  disabled={fetching || !url.trim()}
                >
                  {fetching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {fetching ? 'Fetching...' : 'Fetch'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click "Fetch" to automatically extract content from the URL
              </p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                {mode === 'url' ? 'Content' : 'Content'}
              </label>
              <span className="text-xs text-muted-foreground">
                {content.length.toLocaleString()} characters
              </span>
            </div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={mode === 'url' 
                ? "Content will appear here after fetching, or paste manually..." 
                : "Paste the article content or key excerpts here..."}
              className="bg-secondary/50 min-h-[150px]"
            />
            {content.length > 0 && content.length < 100 && (
              <p className="text-xs text-amber-500">
                Minimum 100 characters required for analysis
              </p>
            )}
          </div>

          {/* Analyze Button */}
          <Button
            variant="outline"
            onClick={handleAnalyze}
            disabled={analyzing || content.trim().length < 100}
            className="w-full"
          >
            {analyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {analyzing ? 'Analyzing with AI...' : 'Analyze with AI'}
          </Button>

          {/* AI Results */}
          {aiResult && (
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 text-primary">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">AI Analysis Complete</span>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Summary
                  </span>
                  <p className="text-sm mt-1">{aiResult.summary}</p>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">
                    Key Takeaways
                  </span>
                  <ul className="text-sm mt-1 space-y-1">
                    {aiResult.takeaways.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  {aiResult.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={
                      aiResult.horizon === '0_5'
                        ? 'horizon-near'
                        : aiResult.horizon === '5_10'
                        ? 'horizon-mid'
                        : 'horizon-far'
                    }
                  >
                    {aiResult.horizon === '0_5'
                      ? '0-5 years'
                      : aiResult.horizon === '5_10'
                      ? '5-10 years'
                      : '10+ years'}
                  </Badge>
                  <Badge variant="secondary">Relevance: {aiResult.relevance}%</Badge>
                  <Badge
                    variant={
                      aiResult.certainty === 'certain'
                        ? 'certainty-certain'
                        : aiResult.certainty === 'wildcard'
                        ? 'certainty-wildcard'
                        : 'certainty-uncertain'
                    }
                  >
                    {aiResult.certainty}
                  </Badge>
                </div>
              </div>
            </div>
          )}
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
            Save Signal
          </Button>
        </div>
      </div>
    </div>
  );
}
