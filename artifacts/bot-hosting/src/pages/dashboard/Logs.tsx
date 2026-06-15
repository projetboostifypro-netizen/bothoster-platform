import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { logsApi, botsApi, type BotLog, type Bot } from "@/lib/api";

const levelColors: Record<string, string> = {
  info: "text-blue-400", error: "text-red-400", warn: "text-yellow-400", debug: "text-muted-foreground",
};
const levelBg: Record<string, string> = {
  error: "bg-red-500/5", warn: "bg-yellow-400/5",
};

function LogMessage({ message }: { message: string }) {
  if (message.startsWith("data:image/")) {
    return <img src={message} alt="QR Code" className="max-w-[200px] max-h-[200px] rounded border border-border" />;
  }
  return <span className="break-all text-foreground">{message}</span>;
}

const Logs = () => {
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [bots, setBots] = useState<Bot[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    try {
      let data: BotLog[];
      if (selectedBotId === "all") {
        data = await logsApi.all(300);
      } else {
        data = await logsApi.forBot(selectedBotId, 300);
      }
      setLogs(data);
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    botsApi.list().then(setBots).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [selectedBotId]);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  const botMap: Record<string, string> = {};
  bots.forEach(b => { botMap[b.id] = b.name; });

  const displayLogs = logs.map(l => ({ ...l, bot_name: botMap[l.bot_id] || l.bot_id?.slice(0,8) || "?" }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading">Logs</h1>
          <p className="text-muted-foreground mt-1">Logs en temps réel de vos bots.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs ${connected ? "text-green-400" : "text-red-400"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
            {connected ? "Connecté" : "Déconnecté"}
          </div>
          <button onClick={fetchLogs} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSelectedBotId("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedBotId === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
          Tous les bots
        </button>
        {bots.map(bot => (
          <button key={bot.id} onClick={() => setSelectedBotId(bot.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedBotId === bot.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {bot.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
            <span className="text-xs text-muted-foreground font-mono">{displayLogs.length} entrée(s)</span>
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span>Live</span>
            </div>
          </div>
          <div className="p-2 font-mono text-xs space-y-px max-h-[600px] overflow-y-auto">
            {displayLogs.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <p className="text-muted-foreground text-sm">Aucun log disponible.</p>
                <p className="text-xs text-muted-foreground">Les logs apparaissent quand un bot est démarré.</p>
              </div>
            ) : (
              displayLogs.map((log) => {
                const time = new Date(log.created_at).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit", second:"2-digit" });
                return (
                  <div key={log.id} className={`flex gap-2 py-1 px-2 rounded hover:bg-secondary/40 transition-colors ${levelBg[log.level] || ""}`}>
                    <span className="text-muted-foreground shrink-0 tabular-nums">{time}</span>
                    <span className={`shrink-0 font-semibold ${levelColors[log.level] || "text-foreground"}`}>[{log.level.toUpperCase().slice(0,4)}]</span>
                    <span className="text-muted-foreground/70 shrink-0 max-w-[80px] truncate">{log.bot_name}</span>
                    <LogMessage message={log.message} />
                  </div>
                );
              })
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Logs;
