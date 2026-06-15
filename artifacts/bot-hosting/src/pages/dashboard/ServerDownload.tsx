import { Download, CheckCircle, Terminal, AlertCircle, FileArchive, Copy, Check, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const steps = [
  {
    title: "Télécharger le ZIP",
    desc: 'Cliquez sur le bouton vert ci-dessous pour télécharger bothoster-server.zip.',
  },
  {
    title: "Uploader sur Katabump",
    desc: 'Dans le panneau Katabump, allez dans l\'onglet "Files" et uploadez le fichier ZIP. Katabump l\'extraira automatiquement.',
  },
  {
    title: "Configurer les variables",
    desc: 'Dans l\'onglet "Startup" ou "Env", ajoutez les variables d\'environnement ci-dessous.',
  },
  {
    title: "Vérifier le fichier de démarrage",
    desc: 'Dans l\'onglet "Startup", le fichier de démarrage doit être "index.js". Puis cliquez Start.',
  },
];

const EDGE_FUNCTION_SPEC = `# Spécification de la fonction Edge "bot-proxy" (version corrigée)

## Rôle
Cette fonction Edge fait le pont entre le serveur Katabump et Supabase.
Elle reçoit TOUTES les requêtes du serveur en POST avec un body JSON,
et les relaie vers l'API REST ou Storage de Supabase avec la clé service_role.

## Authentification
Vérifier le header "x-bot-secret" sur chaque requête.
- Si la valeur ne correspond pas au secret "SECRET DU SERVEUR DE BOT" → HTTP 401

## Format des requêtes reçues (TOUTES en POST)
{
  "method": "GET" | "POST" | "PATCH",
  "path": "/bots?..." ou "/storage/v1/object/sign/bot-files/...",
  "body": { ... } ou null
}

## Règles importantes
1. Si path commence par "/storage/" → URL = SUPABASE_URL + path
2. Sinon → URL = SUPABASE_URL + "/rest/v1" + path
3. Pour PATCH : utiliser "Prefer: return=representation" (PAS return=minimal)
   car return=minimal renvoie 204 sans body et cause une erreur Deno
4. Pour les réponses 204/304 : retourner new Response(null, { status }) SANS body

## Code complet (Deno)

import { serve } from "https://deno.land/std/http/server.ts";

const BOT_SECRET = Deno.env.get("SECRET DU SERVEUR DE BOT") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.headers.get("x-bot-secret") !== BOT_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { method, path, body } = await req.json();

  // Route vers REST ou Storage selon le path
  const url = path.startsWith("/storage/")
    ? \`\${SUPABASE_URL}\${path}\`
    : \`\${SUPABASE_URL}/rest/v1\${path}\`;

  const headers: Record<string, string> = {
    "Authorization": \`Bearer \${SERVICE_ROLE_KEY}\`,
    "apikey": SERVICE_ROLE_KEY,
    "Content-Type": "application/json",
  };
  // IMPORTANT: utiliser return=representation pour PATCH (evite le 204 sans body)
  if (method === "PATCH") headers["Prefer"] = "return=representation";

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // IMPORTANT: les reponses 204/304 n'ont pas de body — ne pas en mettre un
  if (res.status === 204 || res.status === 304) {
    return new Response(null, { status: res.status });
  }

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
});`;

const ServerDownload = () => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EDGE_FUNCTION_SPEC);
      setCopied(true);
      toast({ title: "Copié !", description: "Le cahier a été copié dans le presse-papiers." });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "Erreur", description: "Impossible de copier. Sélectionnez le texte manuellement.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold font-heading">Télécharger le Serveur</h1>
        <p className="text-muted-foreground mt-1">
          Installez le serveur sur votre hébergement (Katabump, VPS…) pour gérer vos bots.
        </p>
      </div>

      {/* Big download button */}
      <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <FileArchive className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="text-xl font-bold font-heading">bothoster-server.zip</p>
          <p className="text-sm text-muted-foreground mt-1">
            Contient : <code className="font-mono bg-secondary px-1 rounded">index.js</code>
            {" · "}
            <code className="font-mono bg-secondary px-1 rounded">package.json</code>
            {" · "}
            <code className="font-mono bg-secondary px-1 rounded">README.txt</code>
          </p>
        </div>
        <Button
          variant="hero"
          size="lg"
          className="text-base px-8 py-3 h-auto"
          asChild
          data-testid="button-download-zip"
        >
          <a href="/bothoster-server.zip" download="bothoster-server.zip">
            <Download className="h-5 w-5 mr-2" />
            Télécharger bothoster-server.zip
          </a>
        </Button>
      </div>

      {/* Steps */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold font-heading">Instructions d'installation</h2>
        <ol className="space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center font-bold mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Env vars */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="font-semibold font-heading flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          Variables d'environnement à configurer
        </h2>

        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Option A — Via Edge Function proxy (recommandé)</p>
          <p className="text-xs text-muted-foreground">Si Lovable a créé une Edge Function "bot-proxy" pour vous.</p>
          <div className="rounded-lg bg-secondary/60 p-3 font-mono text-xs space-y-1 break-all">
            <div><span className="text-muted-foreground">BOT_PROXY_URL=</span><span className="text-primary">https://ynjtcdswwazceswzztkn.supabase.co/functions/v1/bot-proxy</span></div>
            <div><span className="text-muted-foreground">BOT_PROXY_SECRET=</span><span className="text-primary">votre_secret_du_serveur_de_bot</span></div>
            <div><span className="text-muted-foreground">PORT=</span><span className="text-primary">3001</span></div>
          </div>
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Option B — Clé Supabase directe</p>
          <p className="text-xs text-muted-foreground">Si vous avez accès à la clé service_role Supabase.</p>
          <div className="rounded-lg bg-secondary/60 p-3 font-mono text-xs space-y-1 break-all">
            <div><span className="text-muted-foreground">SUPABASE_SERVICE_ROLE_KEY=</span><span className="text-primary">votre_clé_service_role</span></div>
            <div><span className="text-muted-foreground">BOTHOSTER_API_URL=</span><span className="text-primary">https://ynjtcdswwazceswzztkn.supabase.co</span></div>
            <div><span className="text-muted-foreground">PORT=</span><span className="text-primary">3001</span></div>
          </div>
        </div>
      </div>

      {/* Edge Function spec */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold font-heading flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Cahier pour Lovable — Edge Function "bot-proxy"
          </h2>
          <button
            onClick={handleCopy}
            data-testid="button-copy-spec"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              copied
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-secondary text-muted-foreground border border-border hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copié !" : "Copier"}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Copiez ce texte et envoyez-le à Lovable en lui demandant de <strong>remplacer l'Edge Function bot-proxy existante</strong> par cette implémentation.
        </p>
        <pre className="rounded-lg bg-secondary/60 p-4 text-xs text-muted-foreground overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
          {EDGE_FUNCTION_SPEC}
        </pre>
      </div>

      {/* Info note */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3 text-sm">
        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium">Aucun port HTTP requis</p>
          <p className="text-muted-foreground">
            Le serveur surveille Supabase toutes les 5 secondes. Quand vous cliquez
            "Démarrer" dans le dashboard, le serveur le détecte et lance votre bot.
            Seul un accès internet sortant est nécessaire.
          </p>
        </div>
      </div>

      {/* Warning */}
      <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 flex items-start gap-3 text-sm">
        <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-orange-500">Important — Edge Function</p>
          <p className="text-muted-foreground mt-1">
            L'Edge Function doit vérifier le header <code className="font-mono bg-secondary px-1 rounded">x-bot-secret</code> et
            utiliser la clé <code className="font-mono bg-secondary px-1 rounded">service_role</code> pour relayer les requêtes vers Supabase REST.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ServerDownload;
