import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Upload, Link as LinkIcon, Plus, X, FileArchive, Loader2, ArrowLeft } from "lucide-react";
import { botsApi, fileToBase64, type Bot } from "@/lib/api";

const EditBot = () => {
  const { id } = useParams<{ id: string }>();
  const [bot, setBot] = useState<Bot | null>(null);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("discord");
  const [language, setLanguage] = useState("nodejs");
  const [sourceType, setSourceType] = useState<"upload" | "url">("upload");
  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    botsApi.get(id).then(data => {
      setBot(data);
      setName(data.name);
      setPlatform(data.platform || "discord");
      setLanguage(data.language || "nodejs");
      setSourceType((data.source_type as "upload" | "url") || "upload");
      if (data.source_type === "url" && data.source_url) setSourceUrl(data.source_url);
      if (data.env_vars && typeof data.env_vars === "object") {
        setEnvVars(Object.entries(data.env_vars).map(([key, value]) => ({ key, value: String(value) })));
      }
    }).catch(() => {
      toast({ title: "Erreur", description: "Bot introuvable.", variant: "destructive" });
      navigate("/dashboard/bots");
    }).finally(() => setFetching(false));
  }, [id]);

  const addEnvVar = () => setEnvVars([...envVars, { key: "", value: "" }]);
  const removeEnvVar = (i: number) => setEnvVars(envVars.filter((_, idx) => idx !== i));
  const updateEnvVar = (i: number, field: "key" | "value", val: string) => {
    const u = [...envVars]; u[i][field] = val; setEnvVars(u);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "Erreur", description: "Fichier trop lourd (max 50 MB).", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !bot) return;
    setLoading(true);
    try {
      const env_vars: Record<string, string> = {};
      envVars.forEach(({ key, value }) => { if (key.trim()) env_vars[key.trim()] = value; });

      let file_base64: string | undefined;
      if (selectedFile) file_base64 = await fileToBase64(selectedFile);

      await botsApi.update(bot.id, {
        name: name.trim(), platform, language,
        source_type: sourceType,
        source_url: sourceType === "url" ? sourceUrl.trim() : undefined,
        env_vars,
        file_base64,
      });
      toast({ title: "Bot mis à jour !" });
      navigate("/dashboard/bots");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard/bots")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-3xl font-bold font-heading">Modifier le bot</h1>
          <p className="text-muted-foreground mt-1">{bot?.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold font-heading">Informations générales</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Nom du bot</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plateforme</Label>
              <select value={platform} onChange={e => setPlatform(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {["discord","telegram","whatsapp","script"].map(p =>
                  <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Langage</Label>
              <select value={language} onChange={e => setLanguage(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="nodejs">Node.js</option>
                <option value="python">Python</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="font-semibold font-heading">Fichiers du bot</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSourceType("upload")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sourceType === "upload" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              <Upload className="h-4 w-4" />Upload
            </button>
            <button type="button" onClick={() => setSourceType("url")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sourceType === "url" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              <LinkIcon className="h-4 w-4" />URL
            </button>
          </div>
          {sourceType === "upload" ? (
            <div onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files?.[0]; if(f&&f.size<50*1024*1024)setSelectedFile(f); }}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <input ref={fileInputRef} type="file" accept=".zip,.tar.gz,.tgz" className="hidden" onChange={handleFileChange} />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileArchive className="h-6 w-6 text-primary" />
                  <span className="font-medium text-sm">{selectedFile.name}</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setSelectedFile(null); }} className="text-xs text-destructive hover:underline">Supprimer</button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Nouveau fichier ZIP (laissez vide pour conserver l'actuel)</p>
                  <p className="text-xs text-muted-foreground mt-1">max 50 MB</p>
                </>
              )}
            </div>
          ) : (
            <Input placeholder="https://exemple.com/votre-bot.zip" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className="font-mono" />
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold font-heading">Variables d'environnement</h2>
            <button type="button" onClick={addEnvVar} className="flex items-center gap-1 text-sm text-primary hover:underline">
              <Plus className="h-3 w-3" /> Ajouter
            </button>
          </div>
          {envVars.length === 0 && <p className="text-sm text-muted-foreground">Aucune variable configurée.</p>}
          {envVars.map((env, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input placeholder="KEY" value={env.key} onChange={e => updateEnvVar(i, "key", e.target.value)} className="font-mono flex-1" />
              <Input placeholder="value" value={env.value} onChange={e => updateEnvVar(i, "value", e.target.value)} className="font-mono flex-1" />
              <button type="button" onClick={() => removeEnvVar(i)} className="p-2 text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <Button variant="hero" type="submit" className="w-full" disabled={loading}>
          {loading ? "Mise à jour..." : "Enregistrer les modifications"}
        </Button>
      </form>
    </div>
  );
};

export default EditBot;
