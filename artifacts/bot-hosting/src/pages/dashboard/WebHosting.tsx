import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Globe, Server, Zap, Shield, Clock, CheckCircle2,
  Github, Upload, Cpu, HardDrive, Loader2, Plus,
  ExternalLink, Trash2, Eye, Settings2, AlertCircle,
  CreditCard, RefreshCw, X, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hostingApi, type WebSite } from "@/lib/api";

// ─── Constante domaine de base ─────────────────────────────────────────────────
const BASE_DOMAIN = "bothoster.sbs";

// ─── Utilitaire : génère un sous-domaine valide depuis un nom ─────────────────
function toSubdomain(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type SiteStatus = WebSite["status"];
const STATUS_LABELS: Record<SiteStatus, { label: string; color: string; dot: string }> = {
  online:    { label: "En ligne",    color: "text-green-400 bg-green-500/10",         dot: "bg-green-400 animate-pulse" },
  deploying: { label: "Déploiement", color: "text-yellow-400 bg-yellow-500/10",       dot: "bg-yellow-400 animate-pulse" },
  error:     { label: "Erreur",      color: "text-red-400 bg-red-500/10",             dot: "bg-red-400" },
  stopped:   { label: "Arrêté",      color: "text-muted-foreground bg-secondary/30",  dot: "bg-muted-foreground" },
};

const STACKS = ["HTML / CSS", "React / Vite", "Vue.js", "Next.js", "Nuxt.js", "Angular", "PHP", "Autre"];

const plans = [
  {
    id: "starter", name: "Starter", price: "Gratuit", amount: 0, highlighted: false,
    features: [`1 site web`, `500 MB stockage`, `Sous-domaine .${BASE_DOMAIN} inclus`, "SSL automatique", "Déploiement GitHub"],
  },
  {
    id: "pro", name: "Pro", price: "1 500 FCFA", amount: 1500, highlighted: true,
    features: ["5 sites web", "5 GB stockage", "Domaine personnalisé inclus", "SSL automatique", "GitHub + ZIP", "Analytics basique"],
  },
  {
    id: "business", name: "Business", price: "3 500 FCFA", amount: 3500, highlighted: false,
    features: ["Sites illimités", "50 GB stockage", "Domaines illimités", "SSL automatique", "CDN mondial", "Analytics avancé", "Support dédié"],
  },
];

// ─── Badge statut ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: SiteStatus }) => {
  const s = STATUS_LABELS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium", s.color)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
};

// ─── Formulaire déploiement ───────────────────────────────────────────────────
const DeployForm = ({
  onDeploy,
  onCancel,
}: {
  onDeploy: (site: WebSite & { full_domain: string }) => void;
  onCancel: () => void;
}) => {
  const { toast } = useToast();
  const [sourceTab, setSourceTab] = useState<"github" | "zip">("github");
  const [name, setName] = useState("");
  const [subdomainEdit, setSubdomainEdit] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [stack, setStack] = useState("React / Vite");
  const [githubUrl, setGithubUrl] = useState("");
  const [deploying, setDeploying] = useState(false);

  // Sous-domaine auto depuis le nom
  const autoSubdomain = toSubdomain(name);
  const subdomain = subdomainEdit || autoSubdomain;
  const fullDomain = `${subdomain || "monsite"}.${BASE_DOMAIN}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !subdomain) return;
    setDeploying(true);
    try {
      const site = await hostingApi.create({
        name: name.trim(),
        subdomain,
        custom_domain: customDomain.trim() || undefined,
        stack,
        github_url: githubUrl.trim() || undefined,
      }) as WebSite & { full_domain: string; hostinger_sync: { success: boolean; message?: string } };

      onDeploy(site);

      if (site.hostinger_sync?.success) {
        toast({ title: "✅ Site déployé !", description: `Votre site est accessible sur ${site.full_domain}` });
      } else {
        toast({ title: "Site créé", description: `Le sous-domaine ${site.full_domain} sera actif sous peu.` });
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-6 space-y-5">
      <h2 className="font-semibold font-heading flex items-center gap-2">
        <Plus className="h-4 w-4 text-primary" /> Nouveau site web
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Nom + sous-domaine */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nom du site <span className="text-destructive">*</span></Label>
            <Input
              required
              placeholder="Mon Super Site"
              value={name}
              onChange={e => { setName(e.target.value); setSubdomainEdit(""); }}
              data-testid="input-site-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sous-domaine <span className="text-destructive">*</span></Label>
            <div className="flex items-center gap-0">
              <Input
                required
                placeholder={autoSubdomain || "monsite"}
                value={subdomainEdit || autoSubdomain}
                onChange={e => setSubdomainEdit(toSubdomain(e.target.value))}
                className="rounded-r-none font-mono text-sm"
                data-testid="input-subdomain"
              />
              <span className="h-9 px-3 flex items-center bg-secondary/50 border border-l-0 border-border rounded-r-md text-xs text-muted-foreground whitespace-nowrap font-mono">
                .{BASE_DOMAIN}
              </span>
            </div>
          </div>
        </div>

        {/* Aperçu URL */}
        {subdomain && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
            <Globe className="h-4 w-4 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Votre site sera accessible sur :</p>
              <p className="text-sm font-mono font-semibold text-primary">https://{fullDomain}</p>
            </div>
          </div>
        )}

        {/* Domaine personnalisé */}
        <div className="space-y-1.5">
          <Label>Domaine personnalisé <span className="text-muted-foreground text-xs">(optionnel)</span></Label>
          <Input
            placeholder="monsite.com"
            value={customDomain}
            onChange={e => setCustomDomain(e.target.value)}
            data-testid="input-custom-domain"
          />
        </div>

        {/* Stack */}
        <div className="space-y-2">
          <Label>Framework / Stack</Label>
          <div className="flex flex-wrap gap-2">
            {STACKS.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStack(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                  stack === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
                data-testid={`btn-stack-${s}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Source */}
        <div className="space-y-3">
          <Label>Source du code</Label>
          <div className="flex gap-1 bg-secondary/30 rounded-lg p-1 w-fit">
            {[
              { k: "github", label: "GitHub", Icon: Github },
              { k: "zip",    label: "Upload ZIP", Icon: Upload },
            ].map(({ k, label, Icon }) => (
              <button
                key={k}
                type="button"
                onClick={() => setSourceTab(k as any)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                  sourceTab === k ? "bg-card text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          {sourceTab === "github" && (
            <Input
              placeholder="https://github.com/utilisateur/mon-site"
              value={githubUrl}
              onChange={e => setGithubUrl(e.target.value)}
              className="font-mono text-sm"
              data-testid="input-github-url"
            />
          )}

          {sourceTab === "zip" && (
            <div className="rounded-xl border-2 border-dashed border-border bg-secondary/10 p-8 text-center space-y-3">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground opacity-50" />
              <div>
                <p className="text-sm text-muted-foreground">Glissez votre archive ZIP ici</p>
                <p className="text-xs text-muted-foreground/60">ou cliquez pour choisir un fichier</p>
              </div>
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => toast({ title: "Bientôt disponible", description: "L'upload de ZIP arrive très prochainement." })}
              >
                Parcourir...
              </Button>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-secondary/30 p-3 flex gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <span>
            Un sous-domaine <strong className="text-foreground">{fullDomain}</strong> sera généré automatiquement.
            Notre équipe déploie votre site sous 24h.
          </span>
        </div>

        <div className="flex gap-3">
          <Button type="submit" variant="hero" disabled={deploying || !name.trim() || !subdomain} data-testid="button-deploy-submit">
            {deploying
              ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Déploiement...</>
              : <><Zap className="h-4 w-4 mr-2" /> Lancer le déploiement</>
            }
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        </div>
      </form>
    </div>
  );
};

// ─── Composant principal ───────────────────────────────────────────────────────
const WebHosting = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"sites" | "plans">("sites");
  const [sites, setSites] = useState<(WebSite & { full_domain?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeploy, setShowDeploy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingSite, setEditingSite] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", github_url: "", custom_domain: "" });

  const loadSites = async () => {
    setLoading(true);
    try {
      const data = await hostingApi.list();
      setSites(data.map(s => ({ ...s, full_domain: `${s.subdomain}.${BASE_DOMAIN}` })));
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSites(); }, []);

  const handleDeploy = (site: WebSite & { full_domain: string }) => {
    setSites(prev => [{ ...site }, ...prev]);
    setShowDeploy(false);
  };

  const handleDelete = async (site: WebSite) => {
    if (!confirm(`Supprimer "${site.name}" et son sous-domaine ${site.subdomain}.${BASE_DOMAIN} ?`)) return;
    setDeleting(site.id);
    try {
      await hostingApi.delete(site.id);
      setSites(prev => prev.filter(s => s.id !== site.id));
      toast({ title: "Site supprimé", description: `Le sous-domaine ${site.subdomain}.${BASE_DOMAIN} a été libéré.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-heading">Hébergement Web</h1>
            <p className="text-muted-foreground text-sm">
              Déployez vos sites sur <strong className="text-primary font-mono">*.{BASE_DOMAIN}</strong>
            </p>
          </div>
        </div>
        {!showDeploy && (
          <Button variant="hero" onClick={() => setShowDeploy(true)} data-testid="button-new-site">
            <Plus className="h-4 w-4 mr-2" /> Nouveau site
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/30 rounded-lg p-1 w-fit">
        {[
          { k: "sites", label: "Mes sites", Icon: Globe },
          { k: "plans", label: "Tarifs",    Icon: CreditCard },
        ].map(({ k, label, Icon }) => (
          <button
            key={k}
            onClick={() => { setTab(k as any); setShowDeploy(false); }}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
              tab === k ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
            data-testid={`tab-hosting-${k}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {/* Formulaire déploiement */}
      {showDeploy && (
        <DeployForm onDeploy={handleDeploy} onCancel={() => setShowDeploy(false)} />
      )}

      {/* ── MES SITES ── */}
      {tab === "sites" && !showDeploy && (
        <div className="space-y-4">
          {/* Barre d'actions */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{sites.length} site(s) hébergé(s)</p>
            <Button variant="outline" size="sm" onClick={loadSites} disabled={loading} data-testid="button-refresh-sites">
              <RefreshCw className={cn("h-3.5 w-3.5 mr-2", loading && "animate-spin")} /> Actualiser
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sites.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-14 text-center space-y-4">
              <Globe className="h-12 w-12 mx-auto opacity-20" />
              <div>
                <p className="font-medium text-foreground">Aucun site hébergé pour l'instant</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Déployez votre premier site et obtenez un sous-domaine <strong className="font-mono">.{BASE_DOMAIN}</strong> gratuit.
                </p>
              </div>
              <Button variant="hero" onClick={() => setShowDeploy(true)} data-testid="button-first-deploy">
                <Zap className="h-4 w-4 mr-2" /> Déployer mon premier site
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sites.map(site => {
                const domain = site.full_domain || `${site.subdomain}.${BASE_DOMAIN}`;
                const isEditing = editingSite === site.id;
                return (
                  <div key={site.id} className="rounded-xl border border-border bg-card overflow-hidden" data-testid={`site-card-${site.id}`}>
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{site.name}</p>
                            <StatusBadge status={site.status} />
                            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-secondary/50">{site.stack}</span>
                          </div>
                          <a
                            href={`https://${domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary font-mono flex items-center gap-1 hover:underline"
                            data-testid={`link-site-${site.id}`}
                          >
                            {domain} <ExternalLink className="h-3 w-3" />
                          </a>
                          {site.custom_domain && (
                            <a href={`https://${site.custom_domain}`} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-muted-foreground font-mono flex items-center gap-1 hover:underline">
                              {site.custom_domain} <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline"
                            onClick={() => window.open(`https://${domain}`, '_blank')}
                            data-testid={`button-view-site-${site.id}`}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1.5" /> Voir
                          </Button>
                          <Button size="sm" variant={isEditing ? "default" : "outline"}
                            onClick={() => {
                              if (isEditing) {
                                setEditingSite(null);
                              } else {
                                setEditingSite(site.id);
                                setEditForm({ name: site.name, github_url: site.github_url || "", custom_domain: site.custom_domain || "" });
                              }
                            }}
                            data-testid={`button-settings-site-${site.id}`}
                          >
                            {isEditing ? <X className="h-3.5 w-3.5" /> : <Settings2 className="h-3.5 w-3.5" />}
                          </Button>
                          <Button size="sm" variant="outline"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={deleting === site.id}
                            onClick={() => handleDelete(site)}
                            data-testid={`button-delete-site-${site.id}`}
                          >
                            {deleting === site.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Panel paramètres inline */}
                    {isEditing && (
                      <div className="border-t border-border bg-secondary/10 px-5 py-4 space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paramètres du site</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Nom du site</Label>
                            <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                              className="h-8 text-sm" data-testid={`input-edit-name-${site.id}`} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">GitHub URL</Label>
                            <Input value={editForm.github_url} onChange={e => setEditForm(f => ({ ...f, github_url: e.target.value }))}
                              placeholder="https://github.com/..." className="h-8 text-sm font-mono" data-testid={`input-edit-github-${site.id}`} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Domaine personnalisé</Label>
                            <Input value={editForm.custom_domain} onChange={e => setEditForm(f => ({ ...f, custom_domain: e.target.value }))}
                              placeholder="monsite.com" className="h-8 text-sm font-mono" data-testid={`input-edit-domain-${site.id}`} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Sous-domaine BotHoster</Label>
                            <div className="h-8 px-3 flex items-center rounded-md border border-border bg-secondary/30 text-xs font-mono text-muted-foreground">
                              {site.subdomain}.{BASE_DOMAIN}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="hero"
                            onClick={() => {
                              setSites(prev => prev.map(s => s.id === site.id ? { ...s, name: editForm.name, github_url: editForm.github_url || null, custom_domain: editForm.custom_domain || null } : s));
                              setEditingSite(null);
                              toast({ title: "Paramètres mis à jour !" });
                            }}
                            data-testid={`button-save-site-${site.id}`}
                          >
                            <Save className="h-3.5 w-3.5 mr-1.5" /> Sauvegarder
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingSite(null)}>Annuler</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Features grid */}
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Zap,       title: "Sous-domaine instantané", desc: `Obtenez votre sous-domaine .${BASE_DOMAIN} en quelques secondes.` },
              { icon: Shield,    title: "SSL automatique",          desc: "HTTPS gratuit et certificat auto-renouvelé pour tous vos domaines." },
              { icon: Globe,     title: "Domaines personnalisés",   desc: "Connectez votre propre domaine à votre site facilement." },
              { icon: Clock,     title: "Uptime 99.9%",             desc: "Infrastructure fiable avec monitoring 24h/24." },
              { icon: Cpu,       title: "Auto-scaling",             desc: "Votre site s'adapte automatiquement à la charge de trafic." },
              { icon: HardDrive, title: "CDN mondial",              desc: "Contenu distribué globalement pour des temps de chargement ultra-rapides." },
            ].map(f => (
              <div key={f.title} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="font-semibold text-sm">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TARIFS ── */}
      {tab === "plans" && !showDeploy && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Choisissez le plan qui correspond à vos besoins.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={cn(
                  "rounded-xl border bg-card p-5 space-y-4 relative",
                  plan.highlighted ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
                )}
                data-testid={`card-hosting-plan-${plan.id}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs px-3 py-0.5 rounded-full font-medium">Populaire</span>
                  </div>
                )}
                <div>
                  <p className={cn(
                    "text-xs font-semibold uppercase tracking-wide border px-2 py-0.5 rounded-full inline-block",
                    plan.highlighted ? "text-primary border-primary/30" : "text-muted-foreground border-border"
                  )}>
                    {plan.name}
                  </p>
                  <p className="text-2xl font-bold mt-2">
                    {plan.price}
                    {plan.amount > 0 && <span className="text-sm font-normal text-muted-foreground">/mois</span>}
                  </p>
                </div>
                <ul className="space-y-2">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan.highlighted ? "hero" : "outline"}
                  className="w-full"
                  onClick={() => {
                    if (plan.amount === 0) {
                      setTab("sites");
                      setShowDeploy(true);
                    } else {
                      navigate("/dashboard/subscription");
                    }
                  }}
                  data-testid={`btn-hosting-plan-${plan.id}`}
                >
                  {plan.amount === 0 ? "Commencer gratuitement" : "Choisir ce plan"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebHosting;
