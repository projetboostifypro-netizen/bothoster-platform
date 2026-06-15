import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { botsApi, subscriptionApi, type Bot, type Subscription } from "@/lib/api";

const Resources = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [b, s] = await Promise.all([botsApi.list(), subscriptionApi.get()]);
        setBots(b);
        setSubscription(s);
      } catch {}
      setLoading(false);
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-heading">Ressources</h1>
          <p className="text-muted-foreground mt-1">Utilisation de vos quotas.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">Aucun abonnement actif.</p>
        </div>
      </div>
    );
  }

  const totalCpu = bots.reduce((sum, b) => sum + (b.cpu_usage ?? 0), 0);
  const totalRam = bots.reduce((sum, b) => sum + (b.ram_usage ?? 0), 0);
  const botCount = bots.length;
  const planLimits: Record<string, { bots: number; cpu: number }> = {
    free: { bots: 1, cpu: 10 }, standard: { bots: 3, cpu: 30 },
    pro: { bots: 5, cpu: 60 }, business: { bots: 999, cpu: 200 },
  };
  const limits = planLimits[subscription.plan] || planLimits.free;

  const resources = [
    { label: "CPU", used: Math.round(totalCpu), total: limits.cpu, unit: "%" },
    { label: "RAM", used: Math.round(totalRam), total: subscription.ram_limit, unit: " MB" },
    { label: "Bots", used: botCount, total: limits.bots, unit: "" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-heading">Ressources</h1>
        <p className="text-muted-foreground mt-1">
          Utilisation de vos quotas — Plan {subscription.plan === "free" ? "Gratuit" : subscription.plan}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((r) => {
          const pct = r.total > 0 ? Math.round((r.used / r.total) * 100) : 0;
          const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-orange-400" : "bg-primary";
          return (
            <div key={r.label} className="rounded-xl border border-border bg-card p-6 space-y-3" data-testid={`card-resource-${r.label.toLowerCase()}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold font-heading">{r.label}</span>
                <span className="text-sm font-mono text-muted-foreground">{r.used}{r.unit} / {r.total}{r.unit}</span>
              </div>
              <div className="h-3 rounded-full bg-secondary overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{pct}% utilisé</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Resources;
