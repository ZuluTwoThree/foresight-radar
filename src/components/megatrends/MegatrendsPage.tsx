import { useState, useEffect } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Globe,
  Plus,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  Link2,
  Loader2,
  Check,
  Clock,
  TrendingUp,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

interface Trend {
  id: string;
  title: string;
  description: string | null;
}

interface Megatrend {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  linkedTrends?: Trend[];
}

const ITEMS_PER_PAGE = 12;

export function MegatrendsPage() {
  const { currentWorkspace } = useWorkspace();
  const [megatrends, setMegatrends] = useState<Megatrend[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingMegatrend, setEditingMegatrend] = useState<Megatrend | null>(null);
  const [linkingMegatrend, setLinkingMegatrend] = useState<Megatrend | null>(null);
  const [selectedTrends, setSelectedTrends] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchMegatrends = async () => {
    if (!currentWorkspace) return;

    setLoading(true);
    try {
      const { data, count, error } = await supabase
        .from('megatrends')
        .select('*, trend_megatrend(trend_id, trends(id, title, description))', { count: 'exact' })
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (error) throw error;

      const megatrendsWithTrends = data?.map((m: any) => ({
        ...m,
        linkedTrends: m.trend_megatrend?.map((tm: any) => tm.trends).filter(Boolean) || [],
      })) || [];

      setMegatrends(megatrendsWithTrends);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching megatrends:', error);
      toast.error('Failed to load megatrends');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrends = async () => {
    if (!currentWorkspace) return;

    try {
      const { data, error } = await supabase
        .from('trends')
        .select('id, title, description')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrends(data || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  useEffect(() => {
    fetchMegatrends();
    fetchTrends();
  }, [currentWorkspace, currentPage]);

  const filteredMegatrends = searchQuery
    ? megatrends.filter(
        (m) =>
          m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : megatrends;

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleCreate = async () => {
    if (!currentWorkspace || !formTitle.trim()) return;

    setFormLoading(true);
    try {
      const { error } = await supabase.from('megatrends').insert({
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        workspace_id: currentWorkspace.id,
      });

      if (error) throw error;

      toast.success('Megatrend created');
      setShowCreateForm(false);
      setFormTitle('');
      setFormDescription('');
      fetchMegatrends();
    } catch (error) {
      console.error('Error creating megatrend:', error);
      toast.error('Failed to create megatrend');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingMegatrend || !formTitle.trim()) return;

    setFormLoading(true);
    try {
      const { error } = await supabase
        .from('megatrends')
        .update({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
        })
        .eq('id', editingMegatrend.id);

      if (error) throw error;

      toast.success('Megatrend updated');
      setEditingMegatrend(null);
      setFormTitle('');
      setFormDescription('');
      fetchMegatrends();
    } catch (error) {
      console.error('Error updating megatrend:', error);
      toast.error('Failed to update megatrend');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (megatrendId: string) => {
    try {
      // Delete linked trend_megatrend entries first
      await supabase.from('trend_megatrend').delete().eq('megatrend_id', megatrendId);

      const { error } = await supabase.from('megatrends').delete().eq('id', megatrendId);
      if (error) throw error;
      toast.success('Megatrend deleted');
      fetchMegatrends();
    } catch (error) {
      console.error('Error deleting megatrend:', error);
      toast.error('Failed to delete megatrend');
    }
  };

  const handleStartLinking = async (megatrend: Megatrend) => {
    setLinkingMegatrend(megatrend);
    const linkedIds = new Set(megatrend.linkedTrends?.map((t) => t.id) || []);
    setSelectedTrends(linkedIds);
  };

  const handleSaveLinks = async () => {
    if (!linkingMegatrend) return;

    try {
      // Remove existing links
      await supabase.from('trend_megatrend').delete().eq('megatrend_id', linkingMegatrend.id);

      // Add new links
      if (selectedTrends.size > 0) {
        const links = Array.from(selectedTrends).map((trendId) => ({
          trend_id: trendId,
          megatrend_id: linkingMegatrend.id,
        }));

        const { error } = await supabase.from('trend_megatrend').insert(links);
        if (error) throw error;
      }

      toast.success('Trend links updated');
      setLinkingMegatrend(null);
      setSelectedTrends(new Set());
      fetchMegatrends();
    } catch (error) {
      console.error('Error saving links:', error);
      toast.error('Failed to update links');
    }
  };

  const handleStartEdit = (megatrend: Megatrend) => {
    setEditingMegatrend(megatrend);
    setFormTitle(megatrend.title);
    setFormDescription(megatrend.description || '');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Globe className="w-8 h-8 text-primary" />
            Megatrends
          </h1>
          <p className="text-muted-foreground mt-1">
            {totalCount} megatrends shaping the future
          </p>
        </div>
        <Button variant="glow" onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4" />
          New Megatrend
        </Button>
      </div>

      {/* Search */}
      <Card variant="glass">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search megatrends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Megatrends Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredMegatrends.length === 0 ? (
        <Card variant="glass">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">No megatrends found</p>
            <p className="text-sm text-muted-foreground/70 mt-1">
              {searchQuery ? 'Try adjusting your search' : 'Start by creating your first megatrend'}
            </p>
            {!searchQuery && (
              <Button variant="glow" className="mt-4" onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4" />
                New Megatrend
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMegatrends.map((megatrend) => (
            <Card key={megatrend.id} variant="interactive" className="group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold line-clamp-2">{megatrend.title}</h3>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartEdit(megatrend)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleStartLinking(megatrend)}
                    >
                      <Link2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(megatrend.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {megatrend.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {megatrend.description}
                  </p>
                )}

                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <Badge variant="glass">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {megatrend.linkedTrends?.length || 0} trends
                  </Badge>
                </div>

                <div className="flex items-center justify-end text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(megatrend.created_at)}
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

      {/* Create/Edit Modal */}
      {(showCreateForm || editingMegatrend) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setShowCreateForm(false);
              setEditingMegatrend(null);
              setFormTitle('');
              setFormDescription('');
            }}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl glass border border-border animate-slide-up">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold">
                  {editingMegatrend ? 'Edit Megatrend' : 'New Megatrend'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingMegatrend(null);
                    setFormTitle('');
                    setFormDescription('');
                  }}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Climate Change & Sustainability"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe this megatrend and its implications..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingMegatrend(null);
                  setFormTitle('');
                  setFormDescription('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="glow"
                onClick={editingMegatrend ? handleUpdate : handleCreate}
                disabled={formLoading || !formTitle.trim()}
              >
                {formLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {editingMegatrend ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Link Trends Modal */}
      {linkingMegatrend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setLinkingMegatrend(null)} />
          <div className="relative w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl glass border border-border animate-slide-up">
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-semibold">Link Trends</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Select trends to link to "{linkingMegatrend.title}"
                  </p>
                </div>
                <button
                  onClick={() => setLinkingMegatrend(null)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh] space-y-2">
              {trends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No trends available
                </div>
              ) : (
                trends.map((trend) => (
                  <button
                    key={trend.id}
                    onClick={() => {
                      const newSet = new Set(selectedTrends);
                      if (newSet.has(trend.id)) {
                        newSet.delete(trend.id);
                      } else {
                        newSet.add(trend.id);
                      }
                      setSelectedTrends(newSet);
                    }}
                    className={`w-full p-4 rounded-lg text-left transition-colors ${
                      selectedTrends.has(trend.id)
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-secondary/30 hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          selectedTrends.has(trend.id)
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground/30'
                        }`}
                      >
                        {selectedTrends.has(trend.id) && (
                          <Check className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{trend.title}</h4>
                        {trend.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {trend.description}
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
                {selectedTrends.size} trends selected
              </span>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setLinkingMegatrend(null)}>
                  Cancel
                </Button>
                <Button variant="glow" onClick={handleSaveLinks}>
                  <Check className="w-4 h-4" />
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
