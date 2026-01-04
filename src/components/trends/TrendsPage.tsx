import { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { QuickTrendForm } from './QuickTrendForm';
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  Link2,
  Loader2,
  Sparkles,
  Check,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface Signal {
  id: string;
  title: string;
  summary: string | null;
}

interface Trend {
  id: string;
  title: string;
  description: string | null;
  impact: 'low' | 'medium' | 'high' | null;
  certainty: 'certain' | 'uncertain' | 'wildcard' | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  linkedSignals?: Signal[];
}

const ITEMS_PER_PAGE = 12;

export function TrendsPage() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTrend, setEditingTrend] = useState<Trend | null>(null);
  const [linkingTrend, setLinkingTrend] = useState<Trend | null>(null);
  const [selectedSignals, setSelectedSignals] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterImpact, setFilterImpact] = useState<string | null>(null);
  const [filterCertainty, setFilterCertainty] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTrends = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      let query = supabase
        .from('trends')
        .select('*, signal_trend(signal_id, signals(id, title, summary))', { count: 'exact' })
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (filterImpact) {
        query = query.eq('impact', filterImpact as 'low' | 'medium' | 'high');
      }
      if (filterCertainty) {
        query = query.eq('certainty', filterCertainty as 'certain' | 'uncertain' | 'wildcard');
      }

      const { data, count, error } = await query
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      const trendsWithSignals = data?.map((t: any) => ({
        ...t,
        linkedSignals: t.signal_trend?.map((st: any) => st.signals).filter(Boolean) || [],
      })) || [];

      setTrends(trendsWithSignals);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching trends:', error);
      toast.error('Failed to load trends');
    } finally {
      setLoading(false);
    }
  };

  const fetchSignals = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('signals')
        .select('id, title, summary')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSignals(data || []);
    } catch (error) {
      console.error('Error fetching signals:', error);
    }
  };

  useEffect(() => {
    fetchTrends();
    fetchSignals();
  }, [currentWorkspace, currentPage, filterImpact, filterCertainty]);

  const filteredTrends = searchQuery
    ? trends.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : trends;

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleDelete = async (trendId: string) => {
    try {
      // Delete linked signal_trend entries first
      await supabase.from('signal_trend').delete().eq('trend_id', trendId);
      
      const { error } = await supabase.from('trends').delete().eq('id', trendId);
      if (error) throw error;
      toast.success('Trend deleted');
      fetchTrends();
    } catch (error) {
      console.error('Error deleting trend:', error);
      toast.error('Failed to delete trend');
    }
  };

  const handleStartLinking = async (trend: Trend) => {
    setLinkingTrend(trend);
    // Pre-select already linked signals
    const linkedIds = new Set(trend.linkedSignals?.map((s) => s.id) || []);
    setSelectedSignals(linkedIds);
  };

  const handleSaveLinks = async () => {
    if (!linkingTrend) return;

    try {
      // Remove existing links
      await supabase.from('signal_trend').delete().eq('trend_id', linkingTrend.id);

      // Add new links
      if (selectedSignals.size > 0) {
        const links = Array.from(selectedSignals).map((signalId) => ({
          signal_id: signalId,
          trend_id: linkingTrend.id,
        }));

        const { error } = await supabase.from('signal_trend').insert(links);
        if (error) throw error;
      }

      toast.success('Signal links updated');
      setLinkingTrend(null);
      setSelectedSignals(new Set());
      fetchTrends();
    } catch (error) {
      console.error('Error saving links:', error);
      toast.error('Failed to update links');
    }
  };

  const getImpactBadge = (impact: string | null) => {
    switch (impact) {
      case 'low':
        return <Badge variant="impact-low">Low</Badge>;
      case 'medium':
        return <Badge variant="impact-medium">Medium</Badge>;
      case 'high':
        return <Badge variant="impact-high">High</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getCertaintyBadge = (certainty: string | null) => {
    switch (certainty) {
      case 'certain':
        return <Badge variant="certainty-certain">Certain</Badge>;
      case 'uncertain':
        return <Badge variant="certainty-uncertain">Uncertain</Badge>;
      case 'wildcard':
        return <Badge variant="certainty-wildcard">Wildcard</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const clearFilters = () => {
    setFilterImpact(null);
    setFilterCertainty(null);
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary" />
            Trends
          </h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} trends identified
          </p>
        </div>
        <Button variant="glow" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4" />
          New Trend
        </Button>
      </div>

      {/* Search and Filters */}
      <Card variant="glass">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search trends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterImpact || ''}
                onChange={(e) => {
                  setFilterImpact(e.target.value || null);
                  setCurrentPage(1);
                }}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Impacts</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={filterCertainty || ''}
                onChange={(e) => {
                  setFilterCertainty(e.target.value || null);
                  setCurrentPage(1);
                }}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Certainty</option>
                <option value="certain">Certain</option>
                <option value="uncertain">Uncertain</option>
                <option value="wildcard">Wildcard</option>
              </select>
              {(filterImpact || filterCertainty || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trends Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredTrends.length === 0 ? (
        <Card variant="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <TrendingUp className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">No trends found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {searchQuery || filterImpact || filterCertainty
                ? 'Try adjusting your filters'
                : 'Start by creating your first trend'}
            </p>
            {!searchQuery && !filterImpact && !filterCertainty && (
              <Button variant="glow" className="mt-4" onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4" />
                New Trend
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrends.map((trend) => (
            <Card key={trend.id} variant="interactive" className="group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold line-clamp-2">{trend.title}</h3>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartLinking(trend)}
                    >
                      <Link2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(trend.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {trend.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {trend.description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  {getImpactBadge(trend.impact)}
                  {getCertaintyBadge(trend.certainty)}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Link2 className="w-3 h-3" />
                    {trend.linkedSignals?.length || 0} signals
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(trend.created_at)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Create Trend Modal */}
      {showCreateForm && (
        <QuickTrendForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            fetchTrends();
          }}
        />
      )}

      {/* Link Signals Modal */}
      {linkingTrend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setLinkingTrend(null)} />
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl glass border border-border animate-slide-up">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold">Link Signals</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select signals to link to "{linkingTrend.title}"
                  </p>
                </div>
                <button
                  onClick={() => setLinkingTrend(null)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh] space-y-2">
              {signals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No signals available
                </div>
              ) : (
                signals.map((signal) => (
                  <button
                    key={signal.id}
                    onClick={() => {
                      const newSet = new Set(selectedSignals);
                      if (newSet.has(signal.id)) {
                        newSet.delete(signal.id);
                      } else {
                        newSet.add(signal.id);
                      }
                      setSelectedSignals(newSet);
                    }}
                    className={`w-full p-4 rounded-lg text-left transition-colors ${
                      selectedSignals.has(signal.id)
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-secondary/30 hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          selectedSignals.has(signal.id)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {selectedSignals.has(signal.id) && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{signal.title}</h4>
                        {signal.summary && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {signal.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-6 border-t border-border flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedSignals.size} signals selected
              </span>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setLinkingTrend(null)}>
                  Cancel
                </Button>
                <Button variant="glow" onClick={handleSaveLinks}>
                  Save Links
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
