import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden grid-pattern">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 pt-24 pb-16 relative z-10">
        <div className="text-center max-w-4xl mx-auto animate-fade-in">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-1.5 text-xs font-mono text-primary mb-8">
            <Zap className="h-3 w-3" />
            Hébergement de bots simplifié
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold font-heading leading-tight mb-6">
            Déployez vos bots
            <br />
            <span className="text-primary text-glow">en quelques clics</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Hébergez, gérez et surveillez vos bots Discord, Telegram, WhatsApp et scripts automatisés.
            En ligne 24h/24, sans infrastructure complexe.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="lg" asChild className="text-base px-8 py-6">
              <Link to="/register">
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="text-base px-8 py-6">
              <a href="#features">Découvrir</a>
            </Button>
          </div>

          {/* Terminal preview */}
          <div className="mt-16 max-w-2xl mx-auto animate-fade-in-up">
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xl">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
                <span className="text-xs text-muted-foreground font-mono ml-2">terminal</span>
              </div>
              <div className="p-6 font-mono text-sm text-left space-y-2">
                <p className="text-muted-foreground">$ bothoster deploy my-discord-bot</p>
                <p className="text-primary">✓ Bot uploadé avec succès</p>
                <p className="text-primary">✓ Dépendances installées</p>
                <p className="text-primary">✓ Bot démarré — en ligne 🟢</p>
                <p className="text-muted-foreground mt-2">$ bothoster status</p>
                <p className="text-foreground">  my-discord-bot  │  <span className="text-primary">RUNNING</span>  │  CPU 2%  │  RAM 48MB  │  uptime 14d</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
