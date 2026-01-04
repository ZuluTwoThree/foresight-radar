import { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SignalCollector } from '@/components/signals/SignalCollector';
import { QuickTrendForm } from '@/components/trends/QuickTrendForm';
import { ExportPanel } from '@/components/export/ExportPanel';
import {
  Zap,
  TrendingUp,
  Activity,
  Plus,
  ExternalLink,
  Clock,
  Loader2,
  Download,
} from 'lucide-react';

interface Signal {
  id: string;
  title: string;
  url: string | null;
  summary: string | null;
  ai_tags: string[];
  relevance: number;
  horizon: string;
  certainty: string;
  created_at: string;
}

interface Trend {
  id: string;
  title: string;
  impact: string;
  certainty: string;
  created_at: string;
}

export function DashboardContent() {
  const { currentWorkspace } = useWorkspace();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignalCollector, setShowSignalCollector] = useState(false);
  const [showTrendForm, setShowTrendForm] = useState(false);

  const fetchData = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      const [signalsRes, trendsRes] = await Promise.all([
        supabase
          .from('signals')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('trends')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (signalsRes.data) setSignals(signalsRes.data as Signal[]);
      if (trendsRes.data) setTrends(trendsRes.data as Trend[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentWorkspace]);

  const getHorizonBadge = (horizon: string) => {
    switch (horizon) {
      case '0_5':
        return <Badge variant="horizon-near">0-5 years</Badge>;
      case '5_10':
        return <Badge variant="horizon-mid">5-10 years</Badge>;
      case '10_plus':
        return <Badge variant="horizon-far">10+ years</Badge>;
      default:
        return <Badge variant="secondary">{horizon}</Badge>;
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'low':
        return <Badge variant="impact-low">Low Impact</Badge>;
      case 'medium':
        return <Badge variant="impact-medium">Medium Impact</Badge>;
      case 'high':
        return <Badge variant="impact-high">High Impact</Badge>;
      default:
        return <Badge variant="secondary">{impact}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome to {currentWorkspace?.name}. Track and analyze emerging trends.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportPanel
            trigger={
              <Button variant="outline">
                <Download className="w-4 h-4" />
                Export
              </Button>
            }
          />
          <Button variant="outline" onClick={() => setShowTrendForm(true)}>
            <Plus className="w-4 h-4" />
            New Trend
          </Button>
          <Button variant="glow" onClick={() => setShowSignalCollector(true)}>
            <Zap className="w-4 h-4" />
            Scan URL
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Total Signals',
            value: signals.length,
            icon: Zap,
            color: 'text-primary',
            bg: 'bg-primary/10',
          },
          {
            title: 'Active Trends',
            value: trends.length,
            icon: TrendingUp,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
          },
          {
            title: 'This Week',
            value: signals.filter(
              (s) => new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            ).length,
            icon: Activity,
            color: 'text-green-400',
            bg: 'bg-green-500/10',
          },
          {
            title: 'Avg Relevance',
            value: signals.length > 0
              ? Math.round(signals.reduce((sum, s) => sum + s.relevance, 0) / signals.length)
              : 0,
            icon: Activity,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            suffix: '%',
          },
        ].map((kpi) => (
          <Card key={kpi.title} variant="glass">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-3xl font-bold mt-1">
                    {kpi.value}
                    {kpi.suffix}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Signals */}
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Recent Signals
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowSignalCollector(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {signals.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No signals yet</p>
                <Button variant="link" className="mt-2" onClick={() => setShowSignalCollector(true)}>
                  Add your first signal
                </Button>
              </div>
            ) : (
              signals.slice(0, 5).map((signal) => (
                <div
                  key={signal.id}
                  className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{signal.title}</h4>
                      {signal.summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {signal.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {getHorizonBadge(signal.horizon)}
                        {signal.ai_tags?.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {signal.url && (
                      <a
                        href={signal.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(signal.created_at)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Trends */}
        <Card variant="glass">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Active Trends
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowTrendForm(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {trends.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No trends yet</p>
                <Button variant="link" className="mt-2" onClick={() => setShowTrendForm(true)}>
                  Create your first trend
                </Button>
              </div>
            ) : (
              trends.slice(0, 5).map((trend) => (
                <div
                  key={trend.id}
                  className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  <h4 className="font-medium text-sm">{trend.title}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    {getImpactBadge(trend.impact)}
                    <Badge
                      variant={
                        trend.certainty === 'certain'
                          ? 'certainty-certain'
                          : trend.certainty === 'wildcard'
                          ? 'certainty-wildcard'
                          : 'certainty-uncertain'
                      }
                    >
                      {trend.certainty}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDate(trend.created_at)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      {showSignalCollector && (
        <SignalCollector
          onClose={() => setShowSignalCollector(false)}
          onSuccess={() => {
            setShowSignalCollector(false);
            fetchData();
          }}
        />
      )}

      {showTrendForm && (
        <QuickTrendForm
          onClose={() => setShowTrendForm(false)}
          onSuccess={() => {
            setShowTrendForm(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
