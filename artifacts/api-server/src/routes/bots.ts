import { Router } from "express";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { db, genId, normalizeBot, BOTS_DIR } from "../lib/sqldb.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";
import {
  getBotDirectory,
  startBot,
  stopBot,
  scanAndStoreBotFiles,
  applyModifiedFiles,
  extractArchive,
  pushLog,
  updateBotStatus,
} from "../lib/botManager.js";

const router = Router();
router.use(authMiddleware);

router.get("/", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bots = db.prepare("SELECT * FROM bots WHERE user_id=? ORDER BY created_at DESC").all(req.userId!);
  res.json(bots.map(normalizeBot));
});

router.post("/", async (req: AuthRequest, res): Promise<void> => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const { name, description, platform, language, source_type, source_url, env_vars, file_base64 } = req.body || {};
  if (!name) { res.status(400).json({ error: "Nom requis" }); return; }
  const id = genId();
  db.prepare(`INSERT INTO bots(id,user_id,name,description,platform,language,source_type,source_url,env_vars) VALUES(?,?,?,?,?,?,?,?,?)`)
    .run(id, req.userId, name, description || "", platform || "discord", language || "nodejs", source_type || "upload", source_url || null, JSON.stringify(env_vars || {}));
  const bot: any = db.prepare("SELECT * FROM bots WHERE id=?").get(id);
  if (file_base64) {
    try {
      const buf = Buffer.from(file_base64, "base64");
      const botDir = getBotDirectory(id)!;
      fs.mkdirSync(botDir, { recursive: true });
      const tmpZip = path.join(BOTS_DIR, `_up_${id}.zip`);
      fs.writeFileSync(tmpZip, buf);
      extractArchive(tmpZip, botDir);
      fs.unlinkSync(tmpZip);
      const items = fs.readdirSync(botDir);
      if (items.length === 1) {
        const sub = path.join(botDir, items[0]);
        if (fs.statSync(sub).isDirectory()) {
          for (const f of fs.readdirSync(sub)) fs.renameSync(path.join(sub, f), path.join(botDir, f));
          fs.rmdirSync(sub);
        }
      }
      scanAndStoreBotFiles(id, botDir);
    } catch (e: any) {
      pushLog(id, req.userId!, "error", `Erreur upload: ${e.message}`);
    }
  }
  res.status(201).json(normalizeBot(bot));
});

router.get("/:id", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bid = req.params.id as string;
  const bot: any = db.prepare("SELECT * FROM bots WHERE id=? AND user_id=?").get(bid, req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot introuvable" }); return; }
  res.json(normalizeBot(bot));
});

router.put("/:id", async (req: AuthRequest, res): Promise<void> => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bid = req.params.id as string;
  const bot: any = db.prepare("SELECT * FROM bots WHERE id=? AND user_id=?").get(bid, req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot introuvable" }); return; }
  const { name, description, platform, language, source_type, source_url, env_vars, file_base64 } = req.body || {};
  db.prepare("UPDATE bots SET name=?,description=?,platform=?,language=?,source_type=?,source_url=?,env_vars=?,updated_at=datetime('now') WHERE id=?")
    .run(name || bot.name, description ?? bot.description, platform || bot.platform, language || bot.language, source_type || bot.source_type, source_url || bot.source_url, JSON.stringify(env_vars || {}), bid);
  if (file_base64) {
    try {
      const buf = Buffer.from(file_base64, "base64");
      const botDir = getBotDirectory(bid)!;
      fs.mkdirSync(botDir, { recursive: true });
      const tmpZip = path.join(BOTS_DIR, `_up_${bid}.zip`);
      fs.writeFileSync(tmpZip, buf);
      extractArchive(tmpZip, botDir);
      fs.unlinkSync(tmpZip);
      const items = fs.readdirSync(botDir);
      if (items.length === 1) {
        const sub = path.join(botDir, items[0]);
        if (fs.statSync(sub).isDirectory()) {
          for (const f of fs.readdirSync(sub)) fs.renameSync(path.join(sub, f), path.join(botDir, f));
          fs.rmdirSync(sub);
        }
      }
      scanAndStoreBotFiles(bid, botDir);
    } catch (e: any) {
      pushLog(bid, req.userId!, "error", `Erreur upload: ${e.message}`);
    }
  }
  res.json(normalizeBot(db.prepare("SELECT * FROM bots WHERE id=?").get(bid)));
});

router.delete("/:id", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bid = req.params.id as string;
  const bot: any = db.prepare("SELECT id FROM bots WHERE id=? AND user_id=?").get(bid, req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot introuvable" }); return; }
  stopBot(bid);
  db.prepare("DELETE FROM bot_files WHERE bot_id=?").run(bid);
  db.prepare("DELETE FROM bot_logs WHERE bot_id=?").run(bid);
  db.prepare("DELETE FROM bots WHERE id=?").run(bid);
  const botDir = getBotDirectory(bid);
  if (botDir && fs.existsSync(botDir)) fs.rmSync(botDir, { recursive: true, force: true });
  res.json({ success: true });
});

router.post("/:id/start", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bid = req.params.id as string;
  const bot: any = db.prepare("SELECT * FROM bots WHERE id=? AND user_id=?").get(bid, req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot introuvable" }); return; }
  const botDir = getBotDirectory(bid);
  const hasFiles = botDir && fs.existsSync(botDir) && fs.readdirSync(botDir).filter((f) => !f.startsWith("_tmp_")).length > 0;
  if (!hasFiles && normalizeBot(bot)?.source_type === "url" && bot.source_url) {
    updateBotStatus(bid, "deploying");
    try {
      fs.mkdirSync(botDir!, { recursive: true });
      const tmpFile = path.join(BOTS_DIR, `_dl_${bid}.zip`);
      execSync(`curl -fsSL -o "${tmpFile}" "${bot.source_url}"`, { timeout: 60000 });
      extractArchive(tmpFile, botDir!);
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      const items = fs.readdirSync(botDir!);
      if (items.length === 1) {
        const sub2 = path.join(botDir!, items[0]);
        if (fs.statSync(sub2).isDirectory()) {
          for (const f of fs.readdirSync(sub2)) fs.renameSync(path.join(sub2, f), path.join(botDir!, f));
          fs.rmdirSync(sub2);
        }
      }
      scanAndStoreBotFiles(bid, botDir!);
    } catch (e: any) {
      updateBotStatus(bid, "error");
      res.status(400).json({ error: `Erreur téléchargement: ${e.message}` }); return;
    }
  }
  applyModifiedFiles(bid, botDir!);
  const nb = normalizeBot(bot);
  const result = startBot(bid, { language: nb?.language, env_vars: nb?.env_vars, user_id: req.userId });
  if (!result.success) {
    updateBotStatus(bid, "error");
    res.status(400).json({ error: result.message }); return;
  }
  res.json({ success: true, message: result.message });
});

router.post("/:id/stop", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bid = req.params.id as string;
  const bot: any = db.prepare("SELECT id FROM bots WHERE id=? AND user_id=?").get(bid, req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot introuvable" }); return; }
  res.json(stopBot(bid));
});

router.post("/:id/restart", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bid = req.params.id as string;
  const bot: any = db.prepare("SELECT * FROM bots WHERE id=? AND user_id=?").get(bid, req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot introuvable" }); return; }
  stopBot(bid);
  setTimeout(() => {
    applyModifiedFiles(bid, getBotDirectory(bid)!);
    const nb = normalizeBot(bot);
    startBot(bid, { language: nb?.language, env_vars: nb?.env_vars, user_id: req.userId });
  }, 2000);
  res.json({ success: true, message: "Redémarrage en cours..." });
});

router.get("/:id/files", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bid = req.params.id as string;
  const bot: any = db.prepare("SELECT id FROM bots WHERE id=? AND user_id=?").get(bid, req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot introuvable" }); return; }
  res.json(db.prepare("SELECT * FROM bot_files WHERE bot_id=? ORDER BY path").all(bot.id));
});

router.post("/:id/files/sync", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bid = req.params.id as string;
  const bot: any = db.prepare("SELECT id FROM bots WHERE id=? AND user_id=?").get(bid, req.userId!);
  if (!bot) { res.status(404).json({ error: "Bot introuvable" }); return; }
  const botDir = getBotDirectory(bot.id);
  if (!botDir || !fs.existsSync(botDir)) { res.status(400).json({ error: "Répertoire bot introuvable" }); return; }
  scanAndStoreBotFiles(bot.id, botDir);
  const files = db.prepare("SELECT * FROM bot_files WHERE bot_id=? ORDER BY path").all(bot.id);
  res.json({ synced: files.length, files });
});

router.post("/:id/files", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bid = req.params.id as string;
  const { path: filePath, content } = req.body || {};
  if (!filePath) { res.status(400).json({ error: "Chemin requis" }); return; }
  const fid = genId();
  db.prepare("INSERT OR REPLACE INTO bot_files(id,bot_id,user_id,path,content,is_modified) VALUES(?,?,?,?,?,1)").run(fid, bid, req.userId, filePath, content || "");
  res.json(db.prepare("SELECT * FROM bot_files WHERE id=?").get(fid));
});

router.put("/:id/files/:fileId", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bid = req.params.id as string;
  const fid = req.params.fileId as string;
  const { content, is_modified } = req.body || {};
  db.prepare("UPDATE bot_files SET content=?,is_modified=?,updated_at=datetime('now') WHERE id=? AND bot_id=?").run(content || "", is_modified ? 1 : 0, fid, bid);
  res.json(db.prepare("SELECT * FROM bot_files WHERE id=?").get(fid));
});

router.delete("/:id/files/:fileId", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bid = req.params.id as string;
  const fid = req.params.fileId as string;
  db.prepare("DELETE FROM bot_files WHERE id=? AND bot_id=?").run(fid, bid);
  res.json({ success: true });
});

router.get("/:id/logs", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const bid = req.params.id as string;
  const limit = Math.min(parseInt(req.query.limit as string) || 200, 1000);
  const logs = db.prepare("SELECT * FROM bot_logs WHERE bot_id=? ORDER BY created_at DESC LIMIT ?").all(bid, limit);
  res.json(logs.reverse());
});

export default router;
