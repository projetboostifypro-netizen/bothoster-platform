import { Bot, Cpu, HardDrive, Clock, Loader2, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { botsApi, subscriptionApi, type Bot as BotType, type Subscription } from "@/lib/api";

function formatUptime(seconds: number | null): string {
  if (!seconds || seconds === 0) return "—";
  const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600);
  if (d > 0) return `${d}j ${h}h`;
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const platformLabels: Record<string, string> = {
  discord: "Discord", telegram: "Telegram", whatsapp: "WhatsApp", script: "Script",
};

const DashboardHome = () => {
  const [bots, setBots] = useState<BotType[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [botsData, subData] = await Promise.all([botsApi.list(), subscriptionApi.get()]);
        setBots(botsData);
        setSubscription(subData);
      } catch {}
      setLoading(false);
    };
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const activeBots = bots.filter(b => b.status === "online");
  const totalCpu = bots.reduce((sum, b) => sum + (b.cpu_usage ?? 0), 0);
  const totalRam = bots.reduce((sum, b) => sum + (b.ram_usage ?? 0), 0);
  const avgUptime = bots.length > 0 ? (activeBots.length / bots.length * 100).toFixed(1) : "0";

  const stats = [
    { label: "Bots actifs", value: `${activeBots.length}`, icon: Bot, color: "text-primary" },
    { label: "CPU utilisé", value: `${Math.round(totalCpu)}%`, icon: Cpu, color: "text-blue-400" },
    { label: "RAM utilisée", value: `${Math.round(totalRam)} MB`, icon: HardDrive, color: "text-yellow-400" },
    { label: "Disponibilité", value: `${avgUptime}%`, icon: Clock, color: "text-primary" },
  ];

  const statusColor: Record<string, string> = {
    online: "bg-green-500", deploying: "bg-yellow-400 animate-pulse",
    error: "bg-red-500", stopped: "bg-muted-foreground",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-heading">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de vos bots et ressources.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">
              Plan : <span className="text-primary font-bold">
                {subscription ? (subscription.plan === "free" ? "Gratuit" : subscription.plan) : "Aucun"}
              </span>
            </p>
            {subscription ? (
              <p className="text-xs text-muted-foreground">{subscription.ram_limit} MB RAM</p>
            ) : (
              <p className="text-xs text-muted-foreground">Réclamez votre plan gratuit dans la page Abonnement.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold font-heading">{stat.value}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold font-heading mb-4">Bots récents</h2>
        {bots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground text-sm">
            Aucun bot déployé. Commencez par créer votre premier bot.
          </div>
        ) : (
          <div className="space-y-2">
            {bots.slice(0, 5).map((bot) => (
              <div key={bot.id} className="rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor[bot.status] || "bg-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{bot.name}</p>
                    <p className="text-xs text-muted-foreground">{platformLabels[bot.platform] || bot.platform}</p>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                  {bot.status === "online" && <span>⏱ {formatUptime(bot.uptime_seconds)}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHome;
