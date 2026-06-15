import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, Users, Bot, Server, Edit2, X, Check,
  Globe, Clock, CheckCircle2, Truck, Copy, Trash2, RefreshCw, Download, Pencil, Info,
  FolderArchive, MonitorSmartphone, HardDrive, Package,
} from "lucide-react";
import { adminApi, domainOrdersApi, type AppUser, type DomainOrder } from "@/lib/api";

interface AdminUser extends AppUser {
  plan: string;
  ram_limit: number;
}

interface Stats {
  userCount: number;
  botCount: number;
  onlineCount: number;
  activeBots: number;
}

interface EditState {
  userId: string;
  plan: string;
  ram_limit: number;
}

const PLANS = ["free", "standard", "pro", "business"];
const PLAN_RAM: Record<string, number> = { free: 308, standard: 700, pro: 1024, business: 4096 };

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "delivered") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
        <CheckCircle2 className="h-3 w-3" /> Livré
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
      <Clock className="h-3 w-3" /> En attente
    </span>
  );
};

const AdminPanel = () => {
  const { user } = useAuth();
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const [orders, setOrders] = useState<DomainOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [delivering, setDelivering] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "delivered">("all");
  const [downloading, setDownloading] = useState(false);
  const [downloadingSite, setDownloadingSite] = useState(false);
  const [editingDns, setEditingDns] = useState<string | null>(null);
  const [dnsForm, setDnsForm] = useState({ dns1: "", dns2: "" });
  const [savingDns, setSavingDns] = useState(false);
  const [hostingerModal, setHostingerModal] = useState<DomainOrder | null>(null);

  const { toast } = useToast();

  const downloadServerZip = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem("bothoster_jwt");
      const res = await fetch("/api/admin/download-server-zip", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur téléchargement");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bothoster-server.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "ZIP téléchargé !" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const downloadSiteZip = async () => {
    setDownloadingSite(true);
    try {
      const token = localStorage.getItem("bothoster_jwt");
      const res = await fetch("/api/admin/download-site-zip", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Erreur téléchargement");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bothoster-site.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Site ZIP téléchargé !" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setDownloadingSite(false);
    }
  };

  const fetchData = async () => {
    try {
      const [u, s] = await Promise.all([adminApi.users(), adminApi.stats()]);
      setUsers(u as AdminUser[]);
      setStats(s);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await domainOrdersApi.adminList();
      setOrders(data);
    } catch (err: any) {
      toast({ title: "Erreur commandes", description: err.message, variant: "destructive" });
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchOrders();
  }, []);

  const saveEdit = async () => {
    if (!edit) return;
    setSaving(true);
    try {
      await adminApi.updateSubscription(edit.userId, edit.plan, edit.ram_limit);
      await fetchData();
      setEdit(null);
      toast({ title: "Abonnement mis à jour" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deliverOrder = async (id: string) => {
    setDelivering(id);
    try {
      const updated = await domainOrdersApi.deliver(id);
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
      toast({ title: "Commande marquée comme livrée" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setDelivering(null);
    }
  };

  const deleteOrder = async (id: string) => {
    if (!confirm("Supprimer cette commande ?")) return;
    setDeleting(id);
    try {
      await domainOrdersApi.adminDelete(id);
      setOrders(prev => prev.filter(o => o.id !== id));
      toast({ title: "Commande supprimée" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const saveDns = async (id: string) => {
    setSavingDns(true);
    try {
      const updated = await domainOrdersApi.updateDns(id, dnsForm.dns1, dnsForm.dns2);
      setOrders(prev => prev.map(o => o.id === id ? updated : o));
      setEditingDns(null);
      toast({ title: "DNS mis à jour !" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSavingDns(false);
    }
  };

  const copyOrderInfo = (order: DomainOrder) => {
    const text = `Domaine: ${order.domain}\nDNS1: ${order.dns1}\nDNS2: ${order.dns2}\nClient: ${order.client_name} (${order.client_email})`;
    navigator.clipboard.writeText(text);
    setCopied(order.id);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Informations copiées" });
  };

  const filteredOrders = orders.filter(o => filterStatus === "all" || o.status === filterStatus);
  const pendingCount = orders.filter(o => o.status === "pending").length;

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-heading">Panneau Admin</h1>
        <p className="text-muted-foreground mt-1">Gestion des utilisateurs, statistiques et commandes.</p>
      </div>

      {/* ── Téléchargements ZIP ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          <h2 className="font-semibold font-heading">Téléchargements</h2>
          <span className="ml-auto text-xs text-muted-foreground">Dernière version — {new Date().toLocaleDateString("fr-FR")}</span>
        </div>
        <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {/* ZIP Site */}
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                <MonitorSmartphone className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold font-heading">ZIP Site — Vercel</p>
                <p className="text-xs text-muted-foreground mt-0.5">Frontend React/Vite prêt à déployer</p>
              </div>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {[
                "Dashboard complet (bots, crédits, domaines)",
                "Paiements Mobile Money via SoleasPay",
                "Page paramètres avec mise à jour profil",
                "Panneau admin (stats, utilisateurs, ZIPs)",
                "Variables : VITE_API_URL, VITE_SOLEASPAY_API_KEY",
              ].map(item => (
                <li key={item} className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              onClick={downloadSiteZip}
              disabled={downloadingSite}
              data-testid="button-download-site-zip"
              className="w-full bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
              variant="outline"
            >
              {downloadingSite
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération en cours...</>
                : <><Download className="h-4 w-4 mr-2" />Télécharger bothoster-site.zip</>}
            </Button>
          </div>

          {/* ZIP Serveur */}
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <HardDrive className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold font-heading">ZIP Serveur — VPS</p>
                <p className="text-xs text-muted-foreground mt-0.5">Backend Node.js clé en main</p>
              </div>
            </div>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              {[
                "API Express + SQLite (sql.js) standalone",
                "Gestion bots, crédits, SoleasPay, profil",
                "Abonnements, domaines, hébergement web",
                "Dossier data/ avec DB et répertoire bots/",
                "Variables : PORT, DATA_DIR, JWT_SECRET",
              ].map(item => (
                <li key={item} className="flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              onClick={downloadServerZip}
              disabled={downloading}
              data-testid="button-download-server-zip"
              className="w-full bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20"
              variant="outline"
            >
              {downloading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération en cours...</>
                : <><Download className="h-4 w-4 mr-2" />Télécharger bothoster-server.zip</>}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Utilisateurs", value: stats.userCount, icon: Users },
            { label: "Bots totaux", value: stats.botCount, icon: Bot },
            { label: "Bots en ligne", value: stats.onlineCount, icon: Server },
            { label: "Commandes en attente", value: pendingCount, icon: Globe },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{s.label}</span>
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold font-heading">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Domain Orders ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <h2 className="font-semibold font-heading flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Commandes de domaines
            {pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-yellow-500/10 text-yellow-400 font-medium">
                {pendingCount} en attente
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-secondary/30 rounded-lg p-0.5 text-xs">
              {(["all", "pending", "delivered"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    filterStatus === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "Tous" : f === "pending" ? "En attente" : "Livrés"}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={fetchOrders} disabled={ordersLoading}>
              <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {ordersLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground text-sm">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-20" />
            Aucune commande{filterStatus !== "all" ? " dans cette catégorie" : ""}.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredOrders.map(order => (
              <div key={order.id} className="px-6 py-4 space-y-3" data-testid={`admin-order-${order.id}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-primary">{order.cmd_id}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="font-medium font-mono text-sm">{order.domain}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.client_name} — {order.client_email} •{" "}
                      {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyOrderInfo(order)}
                      data-testid={`button-copy-${order.id}`}
                    >
                      {copied === order.id ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                      Copier les infos
                    </Button>
                    {order.status === "pending" && (
                      <Button
                        size="sm"
                        variant="hero"
                        onClick={() => deliverOrder(order.id)}
                        disabled={delivering === order.id}
                        data-testid={`button-deliver-${order.id}`}
                      >
                        {delivering === order.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Truck className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Marquer livré
                      </Button>
                    )}
                    <button
                      onClick={() => deleteOrder(order.id)}
                      disabled={deleting === order.id}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      data-testid={`button-delete-order-${order.id}`}
                    >
                      {deleting === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* DNS info / edit */}
                {editingDns === order.id ? (
                  <div className="rounded-lg bg-secondary/20 px-4 py-3 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground">Modifier les nameservers (DNS) de cette commande :</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">DNS 1 (Nameserver 1)</Label>
                        <Input
                          value={dnsForm.dns1}
                          onChange={e => setDnsForm(f => ({ ...f, dns1: e.target.value }))}
                          placeholder="ns1.votreserveur.com"
                          className="h-8 text-xs font-mono"
                          data-testid={`input-dns1-${order.id}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">DNS 2 (Nameserver 2)</Label>
                        <Input
                          value={dnsForm.dns2}
                          onChange={e => setDnsForm(f => ({ ...f, dns2: e.target.value }))}
                          placeholder="ns2.votreserveur.com"
                          className="h-8 text-xs font-mono"
                          data-testid={`input-dns2-${order.id}`}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveDns(order.id)} disabled={savingDns} data-testid={`button-save-dns-${order.id}`}>
                        {savingDns ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                        Enregistrer
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingDns(null)}>Annuler</Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-secondary/20 px-4 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                    <div><span className="text-muted-foreground block">ID CMD</span>{order.cmd_id}</div>
                    <div><span className="text-muted-foreground block">Domaine</span>{order.domain}</div>
                    <div>
                      <span className="text-muted-foreground block">DNS 1</span>
                      <span className="text-yellow-400">{order.dns1}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">DNS 2</span>
                      <span className="text-yellow-400">{order.dns2}</span>
                    </div>
                  </div>
                )}

                {/* Actions DNS */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      setEditingDns(order.id);
                      setDnsForm({ dns1: order.dns1, dns2: order.dns2 });
                    }}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
                    data-testid={`button-edit-dns-${order.id}`}
                  >
                    <Pencil className="h-3 w-3" /> Modifier les DNS
                  </button>
                  <button
                    onClick={() => setHostingerModal(order)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-400 transition-colors"
                    data-testid={`button-hostinger-${order.id}`}
                  >
                    <Info className="h-3 w-3" /> Instructions Hostinger
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modale Instructions Hostinger ── */}
      {hostingerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="font-semibold font-heading flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Instructions Hostinger — {hostingerModal.domain}
              </h3>
              <button onClick={() => setHostingerModal(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-300 space-y-1">
                <p className="font-semibold text-blue-200">Instructions à envoyer au client :</p>
                <p>Votre client possède le domaine <span className="font-mono font-bold">{hostingerModal.domain}</span> chez Hostinger.</p>
                <p>Il doit modifier les <strong>Nameservers</strong> dans son panel Hostinger.</p>
              </div>

              <div className="space-y-3 text-sm">
                <p className="font-medium">Étapes sur Hostinger :</p>
                <ol className="space-y-2 text-muted-foreground list-none">
                  <li className="flex gap-2"><span className="text-primary font-bold">1.</span> Aller sur <span className="font-mono text-foreground">hostinger.com</span> → Se connecter</li>
                  <li className="flex gap-2"><span className="text-primary font-bold">2.</span> Cliquer sur <strong className="text-foreground">Domaines</strong> dans le menu</li>
                  <li className="flex gap-2"><span className="text-primary font-bold">3.</span> Cliquer sur le domaine <span className="font-mono text-foreground">{hostingerModal.domain}</span></li>
                  <li className="flex gap-2"><span className="text-primary font-bold">4.</span> Aller dans <strong className="text-foreground">Nameservers</strong> ou <strong className="text-foreground">DNS / Serveurs de noms</strong></li>
                  <li className="flex gap-2"><span className="text-primary font-bold">5.</span> Choisir <strong className="text-foreground">Nameservers personnalisés</strong></li>
                  <li className="flex gap-2"><span className="text-primary font-bold">6.</span> Entrer les valeurs ci-dessous et sauvegarder</li>
                </ol>
              </div>

              <div className="rounded-lg bg-secondary/30 border border-border p-4 font-mono text-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground text-xs block">Nameserver 1</span>
                    <span className="text-yellow-400 font-bold">{hostingerModal.dns1}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-muted-foreground text-xs block">Nameserver 2</span>
                    <span className="text-yellow-400 font-bold">{hostingerModal.dns2}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">La propagation DNS prend généralement entre 1h et 24h après la modification.</p>

              <Button
                className="w-full"
                onClick={() => {
                  const text = `Bonjour,\n\nPour activer votre domaine ${hostingerModal.domain}, veuillez modifier vos Nameservers sur Hostinger :\n\n1. Connectez-vous sur hostinger.com\n2. Allez dans Domaines → ${hostingerModal.domain}\n3. Cliquez sur Nameservers → Nameservers personnalisés\n4. Entrez :\n   Nameserver 1 : ${hostingerModal.dns1}\n   Nameserver 2 : ${hostingerModal.dns2}\n5. Sauvegardez\n\nLa propagation prend 1h à 24h.\n\nVotre ID de commande : ${hostingerModal.cmd_id}`;
                  navigator.clipboard.writeText(text);
                  toast({ title: "Message copié !", description: "Collez-le dans votre email ou WhatsApp" });
                }}
                data-testid="button-copy-hostinger-instructions"
              >
                <Copy className="h-4 w-4 mr-2" /> Copier le message pour le client
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Users ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold font-heading">Utilisateurs ({users.length})</h2>
        </div>
        <div className="divide-y divide-border">
          {users.map((u) => (
            <div key={u.id} className="px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium truncate">{u.name}</p>
                  <p className="text-xs text-muted-foreground">{u.email} • {u.role}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{u.plan || "free"}</span>
                  <span className="text-xs text-muted-foreground">{u.ram_limit || 308} MB</span>
                  <button
                    type="button"
                    onClick={() => setEdit({ userId: u.id, plan: u.plan || "free", ram_limit: u.ram_limit || 308 })}
                    className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Modal modification plan utilisateur ── */}
      {!!edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="bg-card rounded-xl border border-border w-full max-w-sm p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-heading font-semibold text-lg">Modifier l'abonnement</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {users.find(u => u.id === edit.userId)?.name} — {users.find(u => u.id === edit.userId)?.email}
                </p>
              </div>
              <button type="button" onClick={() => setEdit(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <div className="rounded-lg border border-input divide-y divide-border bg-background overflow-hidden">
                {PLANS.map(p => {
                  const selected = edit.plan === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEdit({ ...edit, plan: p, ram_limit: PLAN_RAM[p] || 308 })}
                      className={`w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors ${
                        selected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-secondary/50 text-foreground"
                      }`}
                    >
                      <span>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                      <span className={`text-xs ${selected ? "text-primary" : "text-muted-foreground"}`}>
                        {PLAN_RAM[p] || 308} MB RAM
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>RAM (MB)</Label>
              <Input
                type="number"
                value={edit.ram_limit}
                onChange={e => setEdit({ ...edit, ram_limit: Number(e.target.value) })}
                className="h-9"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEdit(null)}>
                Annuler
              </Button>
              <Button type="button" className="flex-1" onClick={saveEdit} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Sauvegarder
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
