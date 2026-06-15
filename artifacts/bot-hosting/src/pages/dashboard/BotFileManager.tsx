import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Loader2, FileCode, RefreshCw, HardDriveDownload, FolderInput } from "lucide-react";
import { filesApi, botsApi, type BotFile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const BotFileManager = () => {
  const { id: botId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [botName, setBotName] = useState<string>("");
  const [files, setFiles] = useState<BotFile[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [showNewFile, setShowNewFile] = useState(false);

  useEffect(() => {
    if (!botId) return;
    botsApi.get(botId).then(b => setBotName(b.name)).catch(() => {});
  }, [botId]);

  const loadFiles = useCallback(async () => {
    if (!botId) return;
    setLoading(true);
    try {
      const data = await filesApi.list(botId);
      setFiles(data);
    } catch (err: any) {
      toast({ title: "Erreur chargement", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [botId]);

  // Auto-sync on first load to pick up runtime-created files
  const syncFromDisk = useCallback(async (silent = false) => {
    if (!botId) return;
    setSyncing(true);
    try {
      const result = await filesApi.sync(botId);
      setFiles(result.files);
      if (!silent) {
        toast({ title: "Synchronisation OK", description: `${result.synced} fichier(s) depuis le disque.` });
      }
    } catch {
      // If sync fails (no files on disk yet), fall back to DB list
      await loadFiles();
    } finally {
      setSyncing(false);
      setLoading(false);
    }
  }, [botId, loadFiles]);

  useEffect(() => { syncFromDisk(true); }, [botId]);

  const selectFile = (file: BotFile) => {
    if (dirty && !confirm("Modifications non sauvegardées. Continuer ?")) return;
    setSelectedPath(file.path);
    setContent(file.content || "");
    setDirty(false);
  };

  const saveFile = async () => {
    if (!botId || !selectedPath) return;
    const file = files.find(f => f.path === selectedPath);
    if (!file) return;
    setSaving(true);
    try {
      await filesApi.update(botId, file.id, content, true);
      setDirty(false);
      setFiles(prev => prev.map(f => f.path === selectedPath ? { ...f, content, is_modified: 1 } : f));
      toast({ title: "Sauvegardé", description: selectedPath });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const createFile = async () => {
    if (!botId || !newFileName.trim()) return;
    try {
      const file = await filesApi.create(botId, newFileName.trim(), "");
      setFiles(prev => [...prev, file]);
      setSelectedPath(file.path);
      setContent("");
      setNewFileName("");
      setShowNewFile(false);
      toast({ title: "Fichier créé", description: file.path });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const deleteFile = async (file: BotFile) => {
    if (!botId || !confirm(`Supprimer ${file.path} ?`)) return;
    try {
      await filesApi.delete(botId, file.id);
      setFiles(prev => prev.filter(f => f.id !== file.id));
      if (selectedPath === file.path) { setSelectedPath(null); setContent(""); }
      toast({ title: "Fichier supprimé" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const getFileIcon = (filePath: string) => {
    const ext = filePath.split(".").pop()?.toLowerCase();
    const icons: Record<string, string> = {
      js: "🟡", ts: "🔵", py: "🐍", json: "📋", md: "📝",
      env: "🔐", yml: "⚙️", yaml: "⚙️", sh: "💻", txt: "📄",
    };
    return icons[ext || ""] || "📄";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/dashboard/bots")} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold font-heading">Fichiers</h1>
          {botName && <p className="text-sm text-muted-foreground">{botName}</p>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Sync from disk */}
          <button
            onClick={() => syncFromDisk(false)}
            disabled={syncing}
            title="Synchroniser depuis le disque (récupère les fichiers créés après démarrage)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-xs font-medium transition-colors disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderInput className="h-3.5 w-3.5" />}
            Sync disque
          </button>
          {/* Refresh from DB */}
          <button
            onClick={loadFiles}
            disabled={loading}
            title="Rafraîchir la liste"
            className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Info banner about session files */}
      <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5 flex items-start gap-2 text-xs text-yellow-400/80">
        <HardDriveDownload className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
        <span>
          Les fichiers créés au runtime (session WhatsApp, cache…) apparaissent après avoir cliqué <strong>Sync disque</strong>.
          Les dossiers <code className="bg-yellow-500/10 px-1 rounded">node_modules/</code>, <code className="bg-yellow-500/10 px-1 rounded">.git/</code> sont exclus.
        </span>
      </div>

      {loading && !syncing ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="flex gap-4 h-[70vh] rounded-xl border border-border overflow-hidden">
          {/* File tree */}
          <div className="w-60 border-r border-border flex flex-col flex-shrink-0 bg-card">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30">
              <span className="text-xs font-medium text-muted-foreground">FICHIERS ({files.length})</span>
              <button onClick={() => setShowNewFile(!showNewFile)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title="Nouveau fichier">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            {showNewFile && (
              <div className="flex gap-1 p-2 border-b border-border">
                <input
                  autoFocus
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  placeholder="fichier.js"
                  onKeyDown={e => { if (e.key === "Enter") createFile(); if (e.key === "Escape") setShowNewFile(false); }}
                  className="flex-1 bg-background border border-input rounded px-2 py-1 text-xs font-mono outline-none focus:border-primary"
                />
                <button onClick={createFile} className="p-1 text-primary hover:opacity-80"><Plus className="h-3 w-3" /></button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto py-1">
              {files.length === 0 ? (
                <div className="text-center py-8 px-3">
                  <FileCode className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                  <p className="text-xs text-muted-foreground">Aucun fichier</p>
                  <p className="text-xs text-muted-foreground mt-1">Cliquez "Sync disque" pour scanner</p>
                </div>
              ) : (
                files.map(file => (
                  <div
                    key={file.id}
                    onClick={() => selectFile(file)}
                    className={`flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-secondary/50 transition-colors group ${selectedPath === file.path ? "bg-secondary" : ""}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="text-xs flex-shrink-0">{getFileIcon(file.path)}</span>
                      <span className={`text-xs font-mono truncate ${file.is_modified ? "text-yellow-400" : "text-foreground"}`} title={file.path}>
                        {file.path}
                      </span>
                      {file.is_modified ? <span className="text-yellow-400 text-xs flex-shrink-0">●</span> : null}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); deleteFile(file); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-all flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedPath ? (
              <>
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30">
                  <span className="text-xs font-mono text-muted-foreground truncate">{selectedPath}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {dirty && <span className="text-xs text-yellow-400">● non sauvegardé</span>}
                    <button
                      onClick={saveFile}
                      disabled={saving || !dirty}
                      className="flex items-center gap-1 px-3 py-1 rounded bg-primary text-primary-foreground text-xs hover:opacity-90 disabled:opacity-40"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      Sauvegarder
                    </button>
                  </div>
                </div>
                <textarea
                  value={content}
                  onChange={e => { setContent(e.target.value); setDirty(true); }}
                  spellCheck={false}
                  className="flex-1 w-full bg-background font-mono text-xs p-4 resize-none outline-none text-foreground"
                  style={{ tabSize: 2 }}
                  onKeyDown={e => {
                    if (e.key === "Tab") {
                      e.preventDefault();
                      const s = e.currentTarget.selectionStart, end = e.currentTarget.selectionEnd;
                      const nv = content.substring(0, s) + "  " + content.substring(end);
                      setContent(nv); setDirty(true);
                      setTimeout(() => { e.currentTarget.selectionStart = e.currentTarget.selectionEnd = s + 2; }, 0);
                    }
                    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); saveFile(); }
                  }}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <FileCode className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Sélectionnez un fichier pour l'éditer</p>
                  <p className="text-xs mt-1 opacity-60">Ctrl+S pour sauvegarder</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BotFileManager;
