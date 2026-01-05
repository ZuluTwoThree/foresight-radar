import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Radar, TrendingUp, Network, Zap, ArrowRight, Sparkles, Globe } from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 gradient-radial pointer-events-none" />
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Radar className="w-5 h-5 text-primary" />
            </div>
            <span className="font-display text-xl font-semibold">Foresight</span>
          </div>
          <Button variant="glow" onClick={() => navigate('/auth')}>
            Loslegen
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <section className="container mx-auto px-6 py-24 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm animate-fade-in">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Foresight-Plattform für Innovations- und Strategieteams</span>
            </div>

            <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight animate-slide-up">
              Von Artikeln und Quellen zu
              <span className="text-gradient block mt-2">strukturierten Zukunftstrends</span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Sammeln Sie Signale aus dem Web, clustern Sie diese automatisch zu Trends, 
              und visualisieren Sie Ihre Erkenntnisse in interaktiven Radars und Netzwerken.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Button variant="glow" size="xl" onClick={() => navigate('/auth')}>
                Kostenlos starten
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-6 py-24">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Zap,
                title: 'Signal Collection',
                description: 'URLs einfügen, Inhalte automatisch extrahieren. KI fasst zusammen und vergibt Tags, Zeithorizont und Relevanz-Score.',
              },
              {
                icon: TrendingUp,
                title: 'Trend Radar',
                description: 'Ordnen Sie Trends nach Zeithorizont (0-5, 5-10, 10+ Jahre) und Impact. Interaktive Radar-Visualisierung mit Drill-Down.',
              },
              {
                icon: Network,
                title: 'Network Analysis',
                description: 'Visualisieren Sie Verbindungen zwischen Signalen, Trends und Megatrends als interaktives Netzwerk-Diagramm.',
              },
              {
                icon: Globe,
                title: 'Megatrends',
                description: 'Fassen Sie verwandte Trends zu übergeordneten Megatrends zusammen. Behalten Sie das strategische Gesamtbild im Blick.',
              },
            ].map((feature, index) => (
              <div
                key={feature.title}
                className="group p-8 rounded-2xl glass hover:border-primary/30 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${0.1 * (index + 1)}s` }}
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-24">
          <div className="relative rounded-3xl glass overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
            <div className="relative p-12 md:p-20 text-center">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">
                Starten Sie Ihre erste Trend-Analyse in 5 Minuten
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">
                Kostenlos starten. Signale sammeln, Trends erkennen, Zukunft visualisieren.
              </p>
              <Button variant="glow" size="xl" onClick={() => navigate('/auth')}>
                Kostenlos starten
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 py-8">
        <div className="container mx-auto px-6 text-center text-muted-foreground text-sm">
          <p>&copy; 2024 Foresight Platform. Zukunftstrends erkennen und visualisieren.</p>
        </div>
      </footer>
    </div>
  );
}
