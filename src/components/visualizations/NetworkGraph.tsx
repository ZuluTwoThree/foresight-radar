import { useState, useEffect, useRef, useCallback } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import cytoscape from 'cytoscape';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Network, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';

interface Signal {
  id: string;
  title: string;
  summary: string | null;
  horizon: string;
  certainty: string;
}

interface Trend {
  id: string;
  title: string;
  description: string | null;
  impact: string;
  certainty: string;
}

interface SignalTrendLink {
  signal_id: string;
  trend_id: string;
}

interface SelectedNode {
  type: 'signal' | 'trend';
  data: Signal | Trend;
}

export function NetworkGraph() {
  const { currentWorkspace } = useWorkspace();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [links, setLinks] = useState<SignalTrendLink[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentWorkspace) return;

      setLoading(true);
      try {
        const [signalsRes, trendsRes, linksRes] = await Promise.all([
          supabase
            .from('signals')
            .select('id, title, summary, horizon, certainty')
            .eq('workspace_id', currentWorkspace.id),
          supabase
            .from('trends')
            .select('id, title, description, impact, certainty')
            .eq('workspace_id', currentWorkspace.id),
          supabase
            .from('signal_trend')
            .select('signal_id, trend_id'),
        ]);

        if (signalsRes.data) setSignals(signalsRes.data);
        if (trendsRes.data) setTrends(trendsRes.data);
        if (linksRes.data) {
          // Filter links to only include those in current workspace
          const signalIds = new Set(signalsRes.data?.map(s => s.id) || []);
          const trendIds = new Set(trendsRes.data?.map(t => t.id) || []);
          const filteredLinks = linksRes.data.filter(
            l => signalIds.has(l.signal_id) && trendIds.has(l.trend_id)
          );
          setLinks(filteredLinks);
        }
      } catch (error) {
        console.error('Error fetching network data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentWorkspace]);

  const initGraph = useCallback(() => {
    if (!containerRef.current || signals.length === 0 && trends.length === 0) return;

    // Destroy existing instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const nodes = [
      ...signals.map((s) => ({
        data: {
          id: `signal-${s.id}`,
          label: s.title.length > 25 ? s.title.slice(0, 25) + '...' : s.title,
          type: 'signal',
          originalData: s,
        },
      })),
      ...trends.map((t) => ({
        data: {
          id: `trend-${t.id}`,
          label: t.title.length > 25 ? t.title.slice(0, 25) + '...' : t.title,
          type: 'trend',
          originalData: t,
        },
      })),
    ];

    const edges = links.map((l) => ({
      data: {
        id: `edge-${l.signal_id}-${l.trend_id}`,
        source: `signal-${l.signal_id}`,
        target: `trend-${l.trend_id}`,
      },
    }));

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': '10px',
            'color': '#94a3b8',
            'text-margin-y': 8,
            'text-wrap': 'ellipsis',
            'text-max-width': '80px',
          },
        },
        {
          selector: 'node[type="signal"]',
          style: {
            'background-color': '#14b8a6',
            'width': 30,
            'height': 30,
            'border-width': 2,
            'border-color': '#0d9488',
          },
        },
        {
          selector: 'node[type="trend"]',
          style: {
            'background-color': '#8b5cf6',
            'width': 40,
            'height': 40,
            'border-width': 2,
            'border-color': '#7c3aed',
            'shape': 'diamond',
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 4,
            'border-color': '#f8fafc',
            'background-opacity': 1,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#334155',
            'target-arrow-color': '#334155',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.6,
          },
        },
        {
          selector: 'edge:selected',
          style: {
            'line-color': '#14b8a6',
            'target-arrow-color': '#14b8a6',
            'opacity': 1,
          },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 500,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 100,
        gravity: 0.8,
      },
      minZoom: 0.3,
      maxZoom: 3,
    });

    // Event handlers
    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      const data = node.data();
      setSelectedNode({
        type: data.type,
        data: data.originalData,
      });
    });

    cyRef.current.on('tap', (evt) => {
      if (evt.target === cyRef.current) {
        setSelectedNode(null);
      }
    });
  }, [signals, trends, links]);

  useEffect(() => {
    if (!loading) {
      initGraph();
    }

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
      }
    };
  }, [loading, initGraph]);

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() / 1.2);
    }
  };

  const handleFit = () => {
    if (cyRef.current) {
      cyRef.current.fit(undefined, 50);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <Network className="w-8 h-8 text-primary" />
            Network Graph
          </h1>
          <p className="text-muted-foreground mt-1">
            Explore relationships between signals and trends
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleFit}>
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Graph */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card variant="glass" className="lg:col-span-2 overflow-hidden">
          <CardContent className="p-0">
            {signals.length === 0 && trends.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[600px] text-center">
                <Network className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground">No data to display</p>
                <p className="text-sm text-muted-foreground/70">
                  Add signals and trends to see the network
                </p>
              </div>
            ) : (
              <div ref={containerRef} className="h-[600px] w-full" />
            )}
          </CardContent>
        </Card>

        {/* Side Panel */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedNode ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <Badge
                    variant={selectedNode.type === 'signal' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {selectedNode.type}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedNode(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <h3 className="font-semibold text-lg">
                  {selectedNode.type === 'signal'
                    ? (selectedNode.data as Signal).title
                    : (selectedNode.data as Trend).title}
                </h3>

                {selectedNode.type === 'signal' ? (
                  <>
                    {(selectedNode.data as Signal).summary && (
                      <p className="text-sm text-muted-foreground">
                        {(selectedNode.data as Signal).summary}
                      </p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="horizon-mid">
                        {(selectedNode.data as Signal).horizon.replace('_', '-')}
                      </Badge>
                      <Badge
                        variant={
                          (selectedNode.data as Signal).certainty === 'certain'
                            ? 'certainty-certain'
                            : (selectedNode.data as Signal).certainty === 'wildcard'
                            ? 'certainty-wildcard'
                            : 'certainty-uncertain'
                        }
                      >
                        {(selectedNode.data as Signal).certainty}
                      </Badge>
                    </div>
                  </>
                ) : (
                  <>
                    {(selectedNode.data as Trend).description && (
                      <p className="text-sm text-muted-foreground">
                        {(selectedNode.data as Trend).description}
                      </p>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Badge
                        variant={
                          (selectedNode.data as Trend).impact === 'high'
                            ? 'impact-high'
                            : (selectedNode.data as Trend).impact === 'medium'
                            ? 'impact-medium'
                            : 'impact-low'
                        }
                      >
                        {(selectedNode.data as Trend).impact} impact
                      </Badge>
                      <Badge
                        variant={
                          (selectedNode.data as Trend).certainty === 'certain'
                            ? 'certainty-certain'
                            : (selectedNode.data as Trend).certainty === 'wildcard'
                            ? 'certainty-wildcard'
                            : 'certainty-uncertain'
                        }
                      >
                        {(selectedNode.data as Trend).certainty}
                      </Badge>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Network className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Click on a node to see details
                </p>
              </div>
            )}

            {/* Legend */}
            <div className="mt-8 pt-6 border-t border-border">
              <h4 className="text-sm font-medium mb-4">Legend</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">Signal</span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 bg-purple-500"
                    style={{ transform: 'rotate(45deg)' }}
                  />
                  <span className="text-sm text-muted-foreground">Trend</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-0.5 bg-slate-600" />
                  <span className="text-sm text-muted-foreground">Link</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card variant="glass">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{signals.length}</p>
            <p className="text-sm text-muted-foreground">Signals</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-purple-500">{trends.length}</p>
            <p className="text-sm text-muted-foreground">Trends</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-slate-400">{links.length}</p>
            <p className="text-sm text-muted-foreground">Connections</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
