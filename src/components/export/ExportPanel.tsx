import { useState } from 'react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Download, FileSpreadsheet, Presentation, ExternalLink, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

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
  description: string | null;
  impact: string | null;
  certainty: string | null;
  created_at: string;
}

interface ExportPanelProps {
  trigger?: React.ReactNode;
}

export function ExportPanel({ trigger }: ExportPanelProps) {
  const { currentWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [miroEmbedUrl, setMiroEmbedUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchAllData = async () => {
    if (!currentWorkspace) return { signals: [], trends: [], links: [] };

    const [signalsRes, trendsRes, linksRes] = await Promise.all([
      supabase
        .from('signals')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('trends')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false }),
      supabase.from('signal_trend').select('*'),
    ]);

    return {
      signals: (signalsRes.data || []) as Signal[],
      trends: (trendsRes.data || []) as Trend[],
      links: linksRes.data || [],
    };
  };

  const exportToCSV = async () => {
    setExporting('csv');
    try {
      const { signals, trends, links } = await fetchAllData();

      // Signals CSV
      const signalHeaders = ['ID', 'Title', 'URL', 'Summary', 'Tags', 'Relevance', 'Horizon', 'Certainty', 'Created At'];
      const signalRows = signals.map((s) => [
        s.id,
        `"${s.title.replace(/"/g, '""')}"`,
        s.url || '',
        `"${(s.summary || '').replace(/"/g, '""')}"`,
        `"${(s.ai_tags || []).join(', ')}"`,
        s.relevance,
        s.horizon,
        s.certainty,
        s.created_at,
      ]);

      const signalsCSV = [signalHeaders.join(','), ...signalRows.map((r) => r.join(','))].join('\n');

      // Trends CSV
      const trendHeaders = ['ID', 'Title', 'Description', 'Impact', 'Certainty', 'Created At'];
      const trendRows = trends.map((t) => [
        t.id,
        `"${t.title.replace(/"/g, '""')}"`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        t.impact || '',
        t.certainty || '',
        t.created_at,
      ]);

      const trendsCSV = [trendHeaders.join(','), ...trendRows.map((r) => r.join(','))].join('\n');

      // Links CSV
      const linkHeaders = ['Signal ID', 'Trend ID'];
      const linkRows = links.map((l: any) => [l.signal_id, l.trend_id]);
      const linksCSV = [linkHeaders.join(','), ...linkRows.map((r: any) => r.join(','))].join('\n');

      // Download all three files
      downloadFile(`signals_${currentWorkspace?.name}_${new Date().toISOString().split('T')[0]}.csv`, signalsCSV);
      downloadFile(`trends_${currentWorkspace?.name}_${new Date().toISOString().split('T')[0]}.csv`, trendsCSV);
      downloadFile(`signal_trend_links_${currentWorkspace?.name}_${new Date().toISOString().split('T')[0]}.csv`, linksCSV);

      toast.success('CSV files exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(null);
    }
  };

  const exportToPPT = async () => {
    setExporting('ppt');
    try {
      const { signals, trends } = await fetchAllData();

      // Generate HTML-based presentation (can be opened in PowerPoint Online or Google Slides)
      const thisWeekSignals = signals.filter(
        (s) => new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length;

      const highImpactTrends = trends.filter((t) => t.impact === 'high');

      const presentationHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentWorkspace?.name} - Foresight Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; }
    .slide { min-height: 100vh; padding: 4rem; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
    .title-slide { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); text-align: center; }
    .title-slide h1 { font-size: 4rem; margin-bottom: 1rem; background: linear-gradient(135deg, #14b8a6, #0ea5e9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .title-slide p { font-size: 1.5rem; color: #94a3b8; }
    .kpi-slide { background: #1e293b; }
    .kpi-slide h2 { font-size: 2.5rem; margin-bottom: 3rem; color: #14b8a6; }
    .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 2rem; }
    .kpi-card { background: #334155; padding: 2rem; border-radius: 1rem; text-align: center; }
    .kpi-card .value { font-size: 4rem; font-weight: bold; color: #14b8a6; }
    .kpi-card .label { font-size: 1.25rem; color: #94a3b8; margin-top: 0.5rem; }
    .trends-slide { background: #0f172a; }
    .trends-slide h2 { font-size: 2.5rem; margin-bottom: 2rem; color: #14b8a6; }
    .trend-item { background: #1e293b; padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 1rem; border-left: 4px solid #14b8a6; }
    .trend-item h3 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .trend-item p { color: #94a3b8; }
    .badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem; margin-right: 0.5rem; }
    .badge-high { background: #ef444433; color: #f87171; }
    .badge-medium { background: #eab30833; color: #fbbf24; }
    .badge-low { background: #22c55e33; color: #4ade80; }
    @media print { .slide { page-break-after: always; } }
  </style>
</head>
<body>
  <div class="slide title-slide">
    <h1>${currentWorkspace?.name}</h1>
    <p>Foresight Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
  </div>

  <div class="slide kpi-slide">
    <h2>Key Metrics</h2>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="value">${signals.length}</div>
        <div class="label">Total Signals</div>
      </div>
      <div class="kpi-card">
        <div class="value">${trends.length}</div>
        <div class="label">Active Trends</div>
      </div>
      <div class="kpi-card">
        <div class="value">${thisWeekSignals}</div>
        <div class="label">Signals This Week</div>
      </div>
      <div class="kpi-card">
        <div class="value">${highImpactTrends.length}</div>
        <div class="label">High Impact Trends</div>
      </div>
    </div>
  </div>

  <div class="slide trends-slide">
    <h2>Top Trends</h2>
    ${trends
      .slice(0, 5)
      .map(
        (t) => `
      <div class="trend-item">
        <h3>${t.title}</h3>
        <p>${t.description || 'No description available'}</p>
        <div style="margin-top: 0.75rem;">
          <span class="badge badge-${t.impact || 'medium'}">${t.impact || 'medium'} impact</span>
        </div>
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>`;

      downloadFile(`${currentWorkspace?.name}_foresight_report_${new Date().toISOString().split('T')[0]}.html`, presentationHtml);
      toast.success('Presentation exported (HTML format)');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export presentation');
    } finally {
      setExporting(null);
    }
  };

  const generateMiroEmbed = () => {
    // Generate an embeddable iframe code for Miro-style visualization
    const embedUrl = `${window.location.origin}/radar`;
    setMiroEmbedUrl(embedUrl);
  };

  const copyEmbedCode = () => {
    const embedCode = `<iframe src="${miroEmbedUrl}" width="100%" height="600" frameborder="0" allowfullscreen></iframe>`;
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Embed code copied');
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="w-4 h-4" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Data</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* CSV Export */}
          <Card variant="interactive" className="cursor-pointer" onClick={exportToCSV}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Export to CSV</h3>
                <p className="text-sm text-muted-foreground">
                  Download signals, trends, and links as spreadsheets
                </p>
              </div>
              {exporting === 'csv' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-muted-foreground" />
              )}
            </CardContent>
          </Card>

          {/* PPT Export */}
          <Card variant="interactive" className="cursor-pointer" onClick={exportToPPT}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Presentation className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Export Presentation</h3>
                <p className="text-sm text-muted-foreground">
                  Generate a foresight report deck (HTML)
                </p>
              </div>
              {exporting === 'ppt' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5 text-muted-foreground" />
              )}
            </CardContent>
          </Card>

          {/* Miro Embed */}
          <Card variant="glass">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <ExternalLink className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Embed Code</h3>
                  <p className="text-sm text-muted-foreground">
                    Get embeddable code for the Trend Radar
                  </p>
                </div>
              </div>

              {!miroEmbedUrl ? (
                <Button variant="outline" className="w-full" onClick={generateMiroEmbed}>
                  Generate Embed Code
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input value={miroEmbedUrl} readOnly className="text-xs" />
                    <Button variant="outline" size="icon" onClick={copyEmbedCode}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this URL in an iframe to embed the Trend Radar view
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
