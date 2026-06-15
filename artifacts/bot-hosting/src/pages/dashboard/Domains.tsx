import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Globe, Search, CheckCircle2, XCircle, Loader2, Package,
  Clock, ShoppingCart, RefreshCw, Trash2, Settings2, Plus, ArrowLeft,
  Server, AlertCircle,
} from "lucide-react";
import { domainOrdersApi, type DomainOrder, type DnsRecord } from "@/lib/api";

const TLDS = [".com", ".net", ".org", ".fr", ".io", ".app", ".dev", ".co", ".info", ".biz"];
const DNS_TYPES = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV"];

type AvailResult = { checked: boolean; available: boolean | null; loading: boolean; domain: string };

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "delivered") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400">
        <CheckCircle2 className="h-3 w-3" /> Actif
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
      <Clock className="h-3 w-3" /> En cours de traitement
    </span>
  );
};

// ─── DNS Manager (affiché quand on gère un domaine livré) ─────────────────────
const DnsManager = ({ order, onBack }: { order: DomainOrder; onBack: () => void }) => {
  const { toast } = useToast();
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: "A", name: "@", value: "", ttl: 3600 });

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await domainOrdersApi.getRecords(order.id);
      setRecords(data);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRecords(); }, []);

  const addRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.value.trim()) return;
    setAdding(true);
    try {
      const rec = await domainOrdersApi.addRecord(order.id, form) as any;
      setRecords(prev => [...prev, rec]);
      setForm({ type: "A", name: "@", value: "", ttl: 3600 });
      setShowForm(false);
      if (rec.hostinger_sync?.success) {
        toast({ title: "✅ Enregistrement ajouté et actif !", description: "La configuration DNS est effective." });
      } else {
        toast({ title: "Enregistrement enregistré", description: "Configuration DNS en cours de déploiement..." });
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const deleteRecord = async (recordId: string) => {
    if (!confirm("Supprimer cet enregistrement DNS ?")) return;
    setDeleting(recordId);
    try {
      await domainOrdersApi.deleteRecord(order.id, recordId);
      setRecords(prev => prev.filter(r => r.id !== recordId));
      toast({ title: "Enregistrement supprimé" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  const typeColor: Record<string, string> = {
    A: "text-blue-400 bg-blue-500/10",
    AAAA: "text-purple-400 bg-purple-500/10",
    CNAME: "text-green-400 bg-green-500/10",
    MX: "text-orange-400 bg-orange-500/10",
    TXT: "text-yellow-400 bg-yellow-500/10",
    NS: "text-pink-400 bg-pink-500/10",
    SRV: "text-cyan-400 bg-cyan-500/10",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-back-to-domains"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <h2 className="font-semibold font-heading font-mono">{order.domain}</h2>
          </div>
          <p className="text-xs text-muted-foreground ml-6">Gestionnaire d'enregistrements DNS</p>
        </div>
      </div>

      {/* Nameservers box */}
      <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-2">
        <p className="text-sm font-semibold flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" /> Serveurs de noms (NS) BotHoster
        </p>
        <p className="text-xs text-muted-foreground">
          Configurez ces serveurs de noms chez votre registrar pour activer la gestion DNS BotHoster :
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
          {["ns1.bothoster.com", "ns2.bothoster.com"].map(ns => (
            <div key={ns} className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2">
              <Globe className="h-3.5 w-3.5 text-primary shrink-0" />
              <code className="text-sm font-mono text-primary flex-1">{ns}</code>
              <button
                onClick={() => { navigator.clipboard.writeText(ns); }}
                className="text-xs text-muted-foreground hover:text-foreground px-1"
                title="Copier"
              >
                📋
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Add record */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Enregistrements DNS
          </h3>
          <Button size="sm" onClick={() => setShowForm(!showForm)} data-testid="button-show-add-record">
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Ajouter
          </Button>
        </div>

        {showForm && (
          <form onSubmit={addRecord} className="px-5 py-4 border-b border-border bg-secondary/10 space-y-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nouvel enregistrement</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="h-9" data-testid="select-dns-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DNS_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nom (Hôte)</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="@ ou www"
                  className="h-9 font-mono text-sm"
                  data-testid="input-dns-name"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-xs">Valeur</Label>
                <Input
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === "A" ? "192.168.1.1" : form.type === "CNAME" ? "monsite.com" : "valeur"}
                  className="h-9 font-mono text-sm"
                  data-testid="input-dns-value"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">TTL (sec)</Label>
                <Input
                  type="number"
                  value={form.ttl}
                  onChange={e => setForm(f => ({ ...f, ttl: Number(e.target.value) }))}
                  className="h-9 font-mono text-sm"
                  data-testid="input-dns-ttl"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={adding} data-testid="button-add-record">
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                Ajouter l'enregistrement
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Aucun enregistrement DNS.</p>
            <p className="text-xs mt-1">Cliquez sur "Ajouter" pour créer votre premier enregistrement.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {/* Table header */}
            <div className="px-5 py-2 grid grid-cols-12 gap-3 text-xs text-muted-foreground font-medium">
              <span className="col-span-2">Type</span>
              <span className="col-span-2">Nom</span>
              <span className="col-span-5">Valeur</span>
              <span className="col-span-2">TTL</span>
              <span className="col-span-1"></span>
            </div>
            {records.map(rec => (
              <div key={rec.id} className="px-5 py-3 grid grid-cols-12 gap-3 items-center text-sm" data-testid={`dns-record-${rec.id}`}>
                <div className="col-span-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold font-mono ${typeColor[rec.type] || "text-muted-foreground bg-secondary/30"}`}>
                    {rec.type}
                  </span>
                </div>
                <div className="col-span-2 font-mono text-xs truncate">{rec.name}</div>
                <div className="col-span-5 font-mono text-xs truncate text-muted-foreground">{rec.value}</div>
                <div className="col-span-2 text-xs text-muted-foreground">{rec.ttl}s</div>
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => deleteRecord(rec.id)}
                    disabled={deleting === rec.id}
                    className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    data-testid={`button-delete-record-${rec.id}`}
                  >
                    {deleting === rec.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="rounded-xl border border-border bg-card/50 p-4 flex gap-3 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-foreground">Propagation DNS</p>
          <p className="text-xs mt-0.5">Les modifications DNS peuvent prendre de 1h à 24h pour être effectives partout dans le monde.</p>
        </div>
      </div>
    </div>
  );
};

// ─── Composant principal ───────────────────────────────────────────────────────
const Domains = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<"order" | "my-orders">("order");
  const [managingOrder, setManagingOrder] = useState<DomainOrder | null>(null);

  const [searchName, setSearchName] = useState("");
  const [tld, setTld] = useState(".com");
  const [avail, setAvail] = useState<AvailResult>({ checked: false, available: null, loading: false, domain: "" });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_name: user?.name || "", client_email: user?.email || "" });
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<DomainOrder | null>(null);

  const [orders, setOrders] = useState<DomainOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const fullDomain = `${searchName.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")}${tld}`;

  const checkAvailability = async () => {
    if (!searchName.trim()) return;
    setAvail({ checked: false, available: null, loading: true, domain: fullDomain });
    setShowForm(false);
    setSuccessOrder(null);
    try {
      const result = await domainOrdersApi.check(fullDomain);
      setAvail({ checked: true, available: result.available, loading: false, domain: fullDomain });
      if (result.available) setShowForm(true);
    } catch {
      setAvail({ checked: true, available: null, loading: false, domain: fullDomain });
    }
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.client_name || !form.client_email) return;
    setSubmitting(true);
    try {
      const order = await domainOrdersApi.create({
        domain: avail.domain,
        client_name: form.client_name,
        client_email: form.client_email,
      });
      setSuccessOrder(order);
      setShowForm(false);
      setAvail({ checked: false, available: null, loading: false, domain: "" });
      setSearchName("");
      toast({ title: "Commande envoyée !", description: "Notre équipe va traiter votre demande." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const loadOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await domainOrdersApi.list();
      setOrders(data);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "my-orders") loadOrders();
    setForm({ client_name: user?.name || "", client_email: user?.email || "" });
  }, [tab, user]);

  // ── DNS Manager ouvert ──
  if (managingOrder) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold font-heading">Domaines</h1>
          <p className="text-muted-foreground mt-1">Gérez vos enregistrements DNS.</p>
        </div>
        <DnsManager order={managingOrder} onBack={() => setManagingOrder(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-heading">Domaines</h1>
        <p className="text-muted-foreground mt-1">Commandez et gérez vos noms de domaine.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/30 rounded-lg p-1 w-fit">
        {[
          { key: "order", label: "Commander", icon: ShoppingCart },
          { key: "my-orders", label: "Mes domaines", icon: Package },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`tab-${key}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* ── COMMANDER ── */}
      {tab === "order" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-semibold font-heading flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Vérifier la disponibilité
            </h2>
            <div className="flex gap-2">
              <Input
                placeholder="mon-site"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && checkAvailability()}
                className="flex-1 font-mono"
                data-testid="input-domain-name"
              />
              <Select value={tld} onValueChange={t => { setTld(t); setAvail({ checked: false, available: null, loading: false, domain: "" }); setShowForm(false); }}>
                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TLDS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={checkAvailability} disabled={avail.loading || !searchName.trim()} data-testid="button-check-domain">
                {avail.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Vérifier"}
              </Button>
            </div>

            {avail.checked && (
              <div className={`flex items-center gap-2 text-sm font-medium ${
                avail.available === true ? "text-green-400" :
                avail.available === false ? "text-red-400" : "text-muted-foreground"
              }`}>
                {avail.available === true ? (
                  <><CheckCircle2 className="h-4 w-4" /><strong>{avail.domain}</strong> est disponible ! Commandez-le ci-dessous.</>
                ) : avail.available === false ? (
                  <><XCircle className="h-4 w-4" /><strong>{avail.domain}</strong> est déjà pris.</>
                ) : (
                  "Vérification impossible — vous pouvez quand même commander."
                )}
              </div>
            )}
          </div>

          {showForm && (
            <div className="rounded-xl border border-primary/30 bg-card p-6 space-y-5">
              <h2 className="font-semibold font-heading flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-primary" />
                Commander <span className="text-primary font-mono">{avail.domain}</span>
              </h2>
              <form onSubmit={submitOrder} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Votre nom complet</Label>
                    <Input
                      required
                      value={form.client_name}
                      onChange={e => setForm({ ...form, client_name: e.target.value })}
                      placeholder="Jean Dupont"
                      data-testid="input-client-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Adresse email</Label>
                    <Input
                      required
                      type="email"
                      value={form.client_email}
                      onChange={e => setForm({ ...form, client_email: e.target.value })}
                      placeholder="jean@exemple.com"
                      data-testid="input-client-email"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-secondary/30 p-4 text-sm space-y-1.5 text-muted-foreground">
                  <p className="font-medium text-foreground">Ce qui est inclus dans votre commande :</p>
                  <p>✅ Enregistrement du domaine <strong className="text-foreground font-mono">{avail.domain}</strong></p>
                  <p>✅ Configuration DNS complète par notre équipe</p>
                  <p>✅ Gestionnaire DNS intégré après activation</p>
                  <p>✅ Livraison sous 24h à 72h</p>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" variant="hero" disabled={submitting} data-testid="button-submit-order">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Envoi...</> : "Confirmer la commande"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                </div>
              </form>
            </div>
          )}

          {successOrder && (
            <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-400">Commande envoyée avec succès !</h3>
                  <p className="text-sm text-muted-foreground">Notre équipe va traiter votre demande et activer votre domaine.</p>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID de commande</span>
                  <strong className="text-primary font-mono">{successOrder.cmd_id}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Domaine</span>
                  <strong className="font-mono">{successOrder.domain}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Statut</span>
                  <StatusBadge status={successOrder.status} />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Une fois votre domaine activé, vous pourrez gérer vos enregistrements DNS depuis l'onglet "Mes domaines".
              </p>

              <Button variant="outline" size="sm" onClick={() => { setSuccessOrder(null); setTab("my-orders"); }}>
                <Package className="h-3.5 w-3.5 mr-2" /> Voir mes domaines
              </Button>
            </div>
          )}

          {!showForm && !successOrder && !avail.checked && (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Recherchez votre nom de domaine</p>
              <p className="text-sm mt-1">Vérifiez la disponibilité puis passez votre commande en quelques secondes.</p>
            </div>
          )}
        </div>
      )}

      {/* ── MES DOMAINES ── */}
      {tab === "my-orders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{orders.length} domaine(s)</p>
            <Button variant="outline" size="sm" onClick={loadOrders} disabled={ordersLoading} data-testid="button-refresh-orders">
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${ordersLoading ? "animate-spin" : ""}`} /> Actualiser
            </Button>
          </div>

          {ordersLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : orders.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucun domaine pour l'instant.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setTab("order")}>
                Commander un domaine
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(order => (
                <div key={order.id} className="rounded-xl border border-border bg-card p-5" data-testid={`order-${order.id}`}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="font-semibold font-mono">{order.domain}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Commandé le {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        {" · "}<span className="font-mono">{order.cmd_id}</span>
                      </p>
                    </div>

                    {order.status === "delivered" ? (
                      <Button
                        size="sm"
                        onClick={() => setManagingOrder(order)}
                        data-testid={`button-manage-dns-${order.id}`}
                      >
                        <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Gérer les DNS
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-yellow-400">
                        <Clock className="h-3.5 w-3.5" />
                        <span>En attente d'activation par notre équipe</span>
                      </div>
                    )}
                  </div>

                  {order.status === "pending" && (
                    <div className="mt-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10 p-3 text-xs text-yellow-300 flex gap-2">
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                      <span>Votre domaine est en cours de configuration. Vous serez notifié dès qu'il sera activé. Cette opération prend généralement 24h à 72h.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Domains;
