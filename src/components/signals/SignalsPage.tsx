import { useState, useEffect, useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SignalCollector } from '@/components/signals/SignalCollector';
import {
  Zap,
  Plus,
  ExternalLink,
  Clock,
  Loader2,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

interface Signal {
  id: string;
  title: string;
  url: string | null;
  content: string | null;
  summary: string | null;
  ai_tags: string[];
  relevance: number;
  horizon: string;
  certainty: string;
  created_at: string;
}

const ITEMS_PER_PAGE = 20;

export function SignalsPage() {
  const { currentWorkspace } = useWorkspace();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCollector, setShowCollector] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterHorizon, setFilterHorizon] = useState<string | null>(null);
  const [filterCertainty, setFilterCertainty] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchSignals = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      let query = supabase
        .from('signals')
        .select('*', { count: 'exact' })
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (filterHorizon) {
        query = query.eq('horizon', filterHorizon as '0_5' | '5_10' | '10_plus');
      }
      if (filterCertainty) {
        query = query.eq('certainty', filterCertainty as 'certain' | 'uncertain' | 'wildcard');
      }

      const { data, count, error } = await query
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      setSignals(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching signals:', error);
      toast.error('Failed to load signals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [currentWorkspace, currentPage, filterHorizon, filterCertainty]);

  const filteredSignals = useMemo(() => {
    if (!searchQuery) return signals;
    const query = searchQuery.toLowerCase();
    return signals.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.summary?.toLowerCase().includes(query) ||
        s.ai_tags?.some((tag) => tag.toLowerCase().includes(query))
    );
  }, [signals, searchQuery]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleDelete = async (signalId: string) => {
    try {
      const { error } = await supabase.from('signals').delete().eq('id', signalId);
      if (error) throw error;
      toast.success('Signal deleted');
      fetchSignals();
    } catch (error) {
      console.error('Error deleting signal:', error);
      toast.error('Failed to delete signal');
    }
  };

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

  const getCertaintyBadge = (certainty: string) => {
    switch (certainty) {
      case 'certain':
        return <Badge variant="certainty-certain">Certain</Badge>;
      case 'uncertain':
        return <Badge variant="certainty-uncertain">Uncertain</Badge>;
      case 'wildcard':
        return <Badge variant="certainty-wildcard">Wildcard</Badge>;
      default:
        return <Badge variant="secondary">{certainty}</Badge>;
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
    setFilterHorizon(null);
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
            <Zap className="w-8 h-8 text-primary" />
            Signals
          </h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} signals collected
          </p>
        </div>
        <Button variant="glow" onClick={() => setShowCollector(true)}>
          <Plus className="w-4 h-4" />
          Add Signal
        </Button>
      </div>

      {/* Search and Filters */}
      <Card variant="glass">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search signals by title, summary, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={filterHorizon || ''}
                onChange={(e) => {
                  setFilterHorizon(e.target.value || null);
                  setCurrentPage(1);
                }}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All Horizons</option>
                <option value="0_5">0-5 years</option>
                <option value="5_10">5-10 years</option>
                <option value="10_plus">10+ years</option>
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
              {(filterHorizon || filterCertainty || searchQuery) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signals List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredSignals.length === 0 ? (
        <Card variant="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Zap className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">No signals found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {searchQuery || filterHorizon || filterCertainty
                ? 'Try adjusting your filters'
                : 'Start by adding your first signal'}
            </p>
            {!searchQuery && !filterHorizon && !filterCertainty && (
              <Button variant="glow" className="mt-4" onClick={() => setShowCollector(true)}>
                <Plus className="w-4 h-4" />
                Add Signal
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSignals.map((signal) => (
            <Card key={signal.id} variant="interactive" className="group">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-semibold text-lg">{signal.title}</h3>
                      <div className="flex items-center gap-2 shrink-0">
                        {signal.url && (
                          <a
                            href={signal.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-secondary transition-colors"
                          >
                            <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => handleDelete(signal.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {signal.summary && (
                      <p className="text-muted-foreground mt-2 line-clamp-2">
                        {signal.summary}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      {getHorizonBadge(signal.horizon)}
                      {getCertaintyBadge(signal.certainty)}
                      <Badge variant="glass" className="text-xs">
                        {signal.relevance}% relevance
                      </Badge>
                      {signal.ai_tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatDate(signal.created_at)}
                    </div>
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

      {/* Signal Collector Modal */}
      {showCollector && (
        <SignalCollector
          onClose={() => setShowCollector(false)}
          onSuccess={() => {
            setShowCollector(false);
            fetchSignals();
          }}
        />
      )}
    </div>
  );
}
