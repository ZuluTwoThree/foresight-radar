import { useState, useEffect, useMemo } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Radar, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Trend {
  id: string;
  title: string;
  description: string | null;
  impact: 'low' | 'medium' | 'high' | null;
  certainty: 'certain' | 'uncertain' | 'wildcard' | null;
  created_at: string;
  signalCount?: number;
}

interface TrendWithPosition extends Trend {
  x: number; // Certainty (0-100)
  y: number; // Impact (0-100)
  z: number; // Signal count (for bubble size)
}

const impactToY = (impact: string | null): number => {
  switch (impact) {
    case 'high': return 85;
    case 'medium': return 50;
    case 'low': return 15;
    default: return 50;
  }
};

const certaintyToX = (certainty: string | null): number => {
  switch (certainty) {
    case 'certain': return 80;
    case 'uncertain': return 50;
    case 'wildcard': return 20;
    default: return 50;
  }
};

const getColorByCertainty = (certainty: string | null): string => {
  switch (certainty) {
    case 'certain': return 'hsl(142, 76%, 45%)';
    case 'uncertain': return 'hsl(45, 93%, 55%)';
    case 'wildcard': return 'hsl(0, 84%, 60%)';
    default: return 'hsl(174, 80%, 50%)';
  }
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const trend = payload[0].payload as TrendWithPosition;
    return (
      <div className="bg-popover border border-border rounded-lg p-4 shadow-xl max-w-xs">
        <h4 className="font-semibold text-sm mb-2">{trend.title}</h4>
        {trend.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-3">
            {trend.description}
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          <Badge
            variant={
              trend.impact === 'high'
                ? 'impact-high'
                : trend.impact === 'medium'
                ? 'impact-medium'
                : 'impact-low'
            }
          >
            {trend.impact || 'medium'} impact
          </Badge>
          <Badge
            variant={
              trend.certainty === 'certain'
                ? 'certainty-certain'
                : trend.certainty === 'wildcard'
                ? 'certainty-wildcard'
                : 'certainty-uncertain'
            }
          >
            {trend.certainty || 'uncertain'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {trend.signalCount || 0} linked signals
        </p>
      </div>
    );
  }
  return null;
};

export function TrendRadar() {
  const { currentWorkspace } = useWorkspace();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [filterImpact, setFilterImpact] = useState<string | null>(null);
  const [filterCertainty, setFilterCertainty] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrends = async () => {
      if (!currentWorkspace) return;

      setLoading(true);
      try {
        // Fetch trends with signal counts
        const { data: trendsData, error } = await supabase
          .from('trends')
          .select('*, signal_trend(signal_id)')
          .eq('workspace_id', currentWorkspace.id);

        if (error) throw error;

        const trendsWithCounts = trendsData?.map((t) => ({
          ...t,
          signalCount: t.signal_trend?.length || 0,
        })) || [];

        setTrends(trendsWithCounts);
      } catch (error) {
        console.error('Error fetching trends:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [currentWorkspace]);

  const filteredTrends = useMemo(() => {
    return trends.filter((t) => {
      if (filterImpact && t.impact !== filterImpact) return false;
      if (filterCertainty && t.certainty !== filterCertainty) return false;
      return true;
    });
  }, [trends, filterImpact, filterCertainty]);

  const chartData: TrendWithPosition[] = useMemo(() => {
    return filteredTrends.map((trend) => ({
      ...trend,
      x: certaintyToX(trend.certainty) + (Math.random() - 0.5) * 10,
      y: impactToY(trend.impact) + (Math.random() - 0.5) * 10,
      z: Math.max(200, (trend.signalCount || 0) * 100 + 200),
    }));
  }, [filteredTrends]);

  const clearFilters = () => {
    setFilterImpact(null);
    setFilterCertainty(null);
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
            <Radar className="w-8 h-8 text-primary" />
            Trend Radar
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize trends by impact and certainty
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={filterImpact || ''}
            onChange={(e) => setFilterImpact(e.target.value || null)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Impacts</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={filterCertainty || ''}
            onChange={(e) => setFilterCertainty(e.target.value || null)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Certainty</option>
            <option value="certain">Certain</option>
            <option value="uncertain">Uncertain</option>
            <option value="wildcard">Wildcard</option>
          </select>
          {(filterImpact || filterCertainty) && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Radar Chart */}
      <Card variant="glass" className="overflow-hidden">
        <CardContent className="p-0">
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <Radar className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No trends to display</p>
              <p className="text-sm text-muted-foreground/70">
                Create trends to see them on the radar
              </p>
            </div>
          ) : (
            <div className="h-[600px] relative">
              {/* Quadrant Labels */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute top-4 left-4 text-xs text-muted-foreground/50 font-medium">
                  High Impact / Wildcard
                </div>
                <div className="absolute top-4 right-4 text-xs text-muted-foreground/50 font-medium text-right">
                  High Impact / Certain
                </div>
                <div className="absolute bottom-12 left-4 text-xs text-muted-foreground/50 font-medium">
                  Low Impact / Wildcard
                </div>
                <div className="absolute bottom-12 right-4 text-xs text-muted-foreground/50 font-medium text-right">
                  Low Impact / Certain
                </div>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart
                  margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
                >
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => {
                      if (value <= 25) return 'Wildcard';
                      if (value >= 75) return 'Certain';
                      return 'Uncertain';
                    }}
                    ticks={[15, 50, 85]}
                    label={{
                      value: 'Certainty',
                      position: 'bottom',
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 14,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    tickLine={{ stroke: 'hsl(var(--border))' }}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => {
                      if (value <= 25) return 'Low';
                      if (value >= 75) return 'High';
                      return 'Medium';
                    }}
                    ticks={[15, 50, 85]}
                    label={{
                      value: 'Impact',
                      angle: -90,
                      position: 'insideLeft',
                      fill: 'hsl(var(--muted-foreground))',
                      fontSize: 14,
                    }}
                  />
                  <ZAxis type="number" dataKey="z" range={[100, 500]} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <ReferenceLine x={50} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <Scatter
                    data={chartData}
                    onClick={(data) => setSelectedTrend(data)}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getColorByCertainty(entry.certainty)}
                        fillOpacity={0.7}
                        stroke={getColorByCertainty(entry.certainty)}
                        strokeWidth={2}
                        className="cursor-pointer hover:fill-opacity-100 transition-all"
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-certainty-certain" />
          <span className="text-sm text-muted-foreground">Certain</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-certainty-uncertain" />
          <span className="text-sm text-muted-foreground">Uncertain</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-certainty-wildcard" />
          <span className="text-sm text-muted-foreground">Wildcard</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-primary/50" />
            <div className="w-5 h-5 rounded-full bg-primary/50 -ml-1" />
          </div>
          <span className="text-sm text-muted-foreground">Size = Signal Count</span>
        </div>
      </div>

      {/* Selected Trend Detail */}
      {selectedTrend && (
        <Card variant="elevated">
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle>{selectedTrend.title}</CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setSelectedTrend(null)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {selectedTrend.description && (
              <p className="text-muted-foreground mb-4">{selectedTrend.description}</p>
            )}
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={
                  selectedTrend.impact === 'high'
                    ? 'impact-high'
                    : selectedTrend.impact === 'medium'
                    ? 'impact-medium'
                    : 'impact-low'
                }
              >
                {selectedTrend.impact || 'medium'} impact
              </Badge>
              <Badge
                variant={
                  selectedTrend.certainty === 'certain'
                    ? 'certainty-certain'
                    : selectedTrend.certainty === 'wildcard'
                    ? 'certainty-wildcard'
                    : 'certainty-uncertain'
                }
              >
                {selectedTrend.certainty || 'uncertain'}
              </Badge>
              <Badge variant="glass">{selectedTrend.signalCount || 0} signals</Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
