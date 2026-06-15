import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { PlusCircle, Play, Square, RotateCcw, Trash2, Loader2, Pencil, FolderOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { botsApi, type Bot } from "@/lib/api";

const platformLabels: Record<string, string> = {
  discord: "Discord", telegram: "Telegram", whatsapp: "WhatsApp", script: "Script",
};
const languageLabels: Record<string, string> = {
  nodejs: "Node.js", python: "Python", other: "Autre",
};
const statusColor: Record<string, string> = {
  online: "bg-green-500", deploying: "bg-yellow-400 animate-pulse",
  error: "bg-red-500", stopped: "bg-muted-foreground",
};
const statusLabel: Record<string, string> = {
  online: "En ligne", deploying: "Démarrage…", error: "Erreur", stopped: "Arrêté",
};

function formatUptime(seconds: number | null): string {
  if (!seconds || seconds === 0) return "—";
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}j ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const BotsList = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchBots = async () => {
    try {
      const data = await botsApi.list();
      setBots(data);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
    const interval = setInterval(fetchBots, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleBot = async (bot: Bot) => {
    const isRunning = bot.status === "online" || bot.status === "deploying";
    setActionLoading(bot.id);
    try {
      if (isRunning) {
        await botsApi.stop(bot.id);
        toast({ title: "Bot arrêté" });
      } else {
        await botsApi.start(bot.id);
        toast({ title: "Démarrage en cours…" });
      }
      await fetchBots();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const restartBot = async (bot: Bot) => {
    setActionLoading(bot.id);
    try {
      await botsApi.restart(bot.id);
      toast({ title: "Redémarrage en cours…" });
      await fetchBots();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteBot = async (id: string) => {
    if (!confirm("Supprimer ce bot définitivement ?")) return;
    setActionLoading(id);
    try {
      await botsApi.delete(id);
      toast({ title: "Bot supprimé" });
      setBots(prev => prev.filter(b => b.id !== id));
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading">Mes Bots</h1>
          <p className="text-muted-foreground mt-1">Gérez et surveillez vos bots.</p>
        </div>
        <Button variant="hero" asChild>
          <Link to="/dashboard/bots/new"><PlusCircle className="h-4 w-4 mr-2" />Nouveau bot</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : bots.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center space-y-4">
          <p className="text-muted-foreground">Aucun bot déployé pour l'instant.</p>
          <Button variant="hero" asChild>
            <Link to="/dashboard/bots/new"><PlusCircle className="h-4 w-4 mr-2" />Déployer votre premier bot</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {bots.map((bot) => {
            const busy = actionLoading === bot.id;
            const isRunning = bot.status === "online" || bot.status === "deploying";
            return (
              <div key={bot.id} data-testid={`card-bot-${bot.id}`} className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor[bot.status] || "bg-muted-foreground"}`} />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{bot.name}</p>
                      <p className="text-xs text-muted-foreground">{statusLabel[bot.status] || bot.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => toggleBot(bot)} disabled={busy} data-testid={`btn-toggle-${bot.id}`}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button onClick={() => restartBot(bot)} disabled={busy || !isRunning} data-testid={`btn-restart-${bot.id}`}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button onClick={() => navigate(`/dashboard/bots/${bot.id}/edit`)} disabled={busy} data-testid={`btn-edit-${bot.id}`}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => navigate(`/dashboard/bots/${bot.id}/files`)} disabled={busy} data-testid={`btn-files-${bot.id}`}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40">
                      <FolderOpen className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteBot(bot.id)} disabled={busy} data-testid={`btn-delete-${bot.id}`}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pl-5">
                  <span>{platformLabels[bot.platform] || bot.platform}</span>
                  <span>{languageLabels[bot.language] || bot.language}</span>
                  {bot.status === "online" && (
                    <>
                      <span>CPU {bot.cpu_usage ?? 0}%</span>
                      <span>RAM {bot.ram_usage ?? 0} MB</span>
                      <span>⏱ {formatUptime(bot.uptime_seconds)}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BotsList;
