import { spawn, execSync, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { db, genId, normalizeBot, BOTS_DIR } from "./sqldb.js";
import { logger } from "./logger.js";

const require = createRequire(import.meta.url);

interface BotData {
  process?: ChildProcess;
  startedAt: number;
  userId: string;
}

export const activeBots = new Map<string, BotData>();

const ENTRY_CANDIDATES: Record<string, string[]> = {
  nodejs: ["index.js","main.js","app.js","bot.js","server.js","start.js","run.js","discord.js","telegram.js","whatsapp.js","src/index.js","src/main.js","src/bot.js","src/app.js"],
  python: ["main.py","bot.py","index.py","app.py","run.py","start.py","src/main.py","src/bot.py"],
};
const TEXT_EXTS = new Set([".js",".mjs",".cjs",".ts",".py",".json",".env",".txt",".yml",".yaml",".md",".sh",".toml",".cfg",".ini",".xml",".html",".css",".jsx",".tsx"]);
const EXCLUDE_DIRS = new Set(["node_modules",".git","__pycache__",".venv","venv","dist","build"]);

export function normalizeBotId(id: string): string {
  return String(id || "").trim().replace(/[^a-zA-Z0-9_-]/g, "");
}

export function getBotDirectory(botId: string): string | null {
  const s = normalizeBotId(botId);
  return s ? path.join(BOTS_DIR, s) : null;
}

export function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*[mGKHFJA-Z]/g, "");
}

export function parseEnvFile(content: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    let v = t.substring(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    vars[t.substring(0, eq).trim()] = v;
  }
  return vars;
}

export function pushLog(botId: string, userId: string | null, level: string, message: string) {
  if (!db || !message) return;
  try {
    db.prepare("INSERT INTO bot_logs(id,bot_id,user_id,level,message) VALUES(?,?,?,?,?)").run(genId(), botId, userId || null, level, String(message).slice(0, 2000));
  } catch {}
}

export function updateBotStatus(botId: string, status: string, extra: Record<string, any> = {}) {
  if (!db || !botId) return;
  try {
    const fields: Record<string, any> = { status, updated_at: new Date().toISOString(), ...extra };
    const sets = Object.keys(fields).map((k) => `${k}=?`).join(",");
    db.prepare(`UPDATE bots SET ${sets} WHERE id=?`).run(...Object.values(fields), botId);
  } catch (e: any) {
    logger.warn({ err: e }, "[db] updateBotStatus");
  }
}

export function resolveRuntime(language: string) {
  return language === "python" ? { command: "python3", key: "python" } : { command: "node", key: "nodejs" };
}

export function resolveEntryFile(botDir: string, config: any = {}): string | null {
  const runtime = resolveRuntime(config.language);
  const customs = [config.entry, config.entrypoint, config.start_file].filter(Boolean).map((e: any) => path.basename(String(e)));
  const candidates = [...customs, ...ENTRY_CANDIDATES[runtime.key]];
  const searchDirs = [botDir];
  try {
    fs.readdirSync(botDir).filter((e) => fs.statSync(path.join(botDir, e)).isDirectory()).forEach((d) => searchDirs.push(path.join(botDir, d)));
  } catch {}
  for (const dir of searchDirs) {
    for (const c of candidates) {
      const fp = path.join(dir, c);
      if (fs.existsSync(fp) && fs.statSync(fp).isFile()) return fp;
    }
  }
  return null;
}

export function getBotMetrics(pid?: number) {
  if (!pid) return null;
  try {
    const out = execSync(`ps -p ${pid} -o pid=,pcpu=,rss= 2>/dev/null`, { timeout: 2000 }).toString().trim();
    if (!out) return null;
    const [, cpu, rss] = out.split(/\s+/).map(Number);
    return { cpu: cpu || 0, ram: (rss || 0) / 1024 };
  } catch {
    return null;
  }
}

export function startBot(botId: string, config: { language?: string; env_vars?: any; user_id?: string }): { success: boolean; message: string } {
  const botDir = getBotDirectory(botId);
  if (!botDir || !fs.existsSync(botDir)) return { success: false, message: "Répertoire bot introuvable" };

  if (activeBots.has(botId)) {
    const existing = activeBots.get(botId)!;
    try { existing.process?.kill(); } catch {}
    activeBots.delete(botId);
  }

  const entryFile = resolveEntryFile(botDir, config);
  if (!entryFile) return { success: false, message: "Fichier d'entrée introuvable (index.js, main.py, etc.)" };

  const runtime = resolveRuntime(config.language || "nodejs");
  const env: Record<string, string> = { ...process.env as Record<string, string> };
  const envFilePath = path.join(botDir, ".env");
  if (fs.existsSync(envFilePath)) {
    try { Object.assign(env, parseEnvFile(fs.readFileSync(envFilePath, "utf8"))); } catch {}
  }
  if (config.env_vars && typeof config.env_vars === "object") {
    Object.assign(env, config.env_vars);
  }

  let proc: ChildProcess;
  const relEntry = path.relative(botDir, entryFile);

  try {
    if (runtime.key === "nodejs" && fs.existsSync(path.join(botDir, "package.json"))) {
      try { execSync("npm install --production --silent", { cwd: botDir, timeout: 60000, env }); } catch {}
    } else if (runtime.key === "python" && fs.existsSync(path.join(botDir, "requirements.txt"))) {
      try { execSync("pip3 install -r requirements.txt -q", { cwd: botDir, timeout: 120000, env }); } catch {}
    }

    proc = spawn(runtime.command, [relEntry], { cwd: botDir, env, detached: false });
  } catch (e: any) {
    return { success: false, message: `Erreur démarrage: ${e.message}` };
  }

  const userId = config.user_id || null;
  activeBots.set(botId, { process: proc, startedAt: Date.now(), userId: userId || "" });
  updateBotStatus(botId, "running", { last_started_at: new Date().toISOString() });
  pushLog(botId, userId, "info", `Bot démarré — commande: ${runtime.command} ${relEntry}`);

  proc.stdout?.on("data", (d: Buffer) => { pushLog(botId, userId, "info", stripAnsi(d.toString())); });
  proc.stderr?.on("data", (d: Buffer) => { pushLog(botId, userId, "error", stripAnsi(d.toString())); });
  proc.on("exit", (code) => {
    activeBots.delete(botId);
    updateBotStatus(botId, code === 0 ? "stopped" : "error");
    pushLog(botId, userId, code === 0 ? "info" : "error", `Bot arrêté (code: ${code ?? "?"}).`);
  });

  return { success: true, message: `Bot démarré avec ${runtime.command} ${relEntry}` };
}

export function stopBot(botId: string): { success: boolean; message: string } {
  const bd = activeBots.get(botId);
  if (!bd) return { success: false, message: "Bot non actif" };
  try {
    bd.process?.kill("SIGTERM");
    setTimeout(() => { try { bd.process?.kill("SIGKILL"); } catch {} }, 5000);
  } catch {}
  activeBots.delete(botId);
  updateBotStatus(botId, "stopped");
  return { success: true, message: "Bot arrêté" };
}

export function scanAndStoreBotFiles(botId: string, botDir: string) {
  if (!db || !fs.existsSync(botDir)) return;
  function walk(dir: string, rel = "") {
    let entries: string[] = [];
    try { entries = fs.readdirSync(dir); } catch { return; }
    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry)) continue;
      const full = path.join(dir, entry);
      const relPath = rel ? `${rel}/${entry}` : entry;
      const stat = fs.statSync(full);
      if (stat.isDirectory()) { walk(full, relPath); continue; }
      const ext = path.extname(entry).toLowerCase();
      if (!TEXT_EXTS.has(ext) || stat.size > 500000) continue;
      let content = "";
      try { content = fs.readFileSync(full, "utf8"); } catch { continue; }
      const existing: any = db!.prepare("SELECT id FROM bot_files WHERE bot_id=? AND path=?").get(botId, relPath);
      if (existing) {
        if (!existing.is_modified) db!.prepare("UPDATE bot_files SET content=?,updated_at=datetime('now') WHERE id=?").run(content, existing.id);
      } else {
        db!.prepare("INSERT INTO bot_files(id,bot_id,user_id,path,content,is_modified) VALUES(?,?,?,?,?,0)").run(genId(), botId, null, relPath, content);
      }
    }
  }
  walk(botDir);
}

export function applyModifiedFiles(botId: string, botDir: string | null) {
  if (!db || !botDir) return;
  const modified: any[] = db.prepare("SELECT * FROM bot_files WHERE bot_id=? AND is_modified=1").all(botId);
  for (const f of modified) {
    try {
      const full = path.join(botDir, f.path);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, f.content || "");
    } catch {}
  }
}

export function extractArchive(zipPath: string, destDir: string) {
  let AdmZip: any;
  try { AdmZip = require("adm-zip"); } catch { throw new Error("adm-zip non disponible"); }
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(destDir, true);
}

setInterval(() => {
  if (!db) return;
  for (const [botId, bd] of activeBots.entries()) {
    const metrics = getBotMetrics(bd.process?.pid);
    const uptime = Math.floor((Date.now() - bd.startedAt) / 1000);
    if (metrics) {
      try {
        db.prepare("UPDATE bots SET cpu_usage=?,ram_usage=?,uptime_seconds=?,updated_at=datetime('now') WHERE id=?").run(metrics.cpu, metrics.ram, uptime, botId);
      } catch {}
    }
  }
}, 10000);
