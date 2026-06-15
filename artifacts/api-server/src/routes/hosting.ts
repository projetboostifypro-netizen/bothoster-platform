import { Router } from "express";
import { db, genId } from "../lib/sqldb.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/sites", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  res.json(db.prepare("SELECT * FROM web_sites WHERE user_id=? ORDER BY created_at DESC").all(req.userId!));
});

router.post("/sites", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const { name, subdomain, custom_domain, stack, github_url } = req.body || {};
  if (!name || !subdomain) { res.status(400).json({ error: "name et subdomain requis" }); return; }
  const existing: any = db.prepare("SELECT id FROM web_sites WHERE subdomain=?").get((subdomain as string).toLowerCase());
  if (existing) { res.status(409).json({ error: "Sous-domaine déjà utilisé" }); return; }
  const id = genId();
  db.prepare("INSERT INTO web_sites(id,user_id,name,subdomain,custom_domain,stack,github_url,status) VALUES(?,?,?,?,?,?,?,?)").run(id, req.userId, name, (subdomain as string).toLowerCase(), custom_domain || null, stack || "HTML / CSS", github_url || null, "online");
  const site: any = db.prepare("SELECT * FROM web_sites WHERE id=?").get(id);
  res.status(201).json({ ...site, full_domain: `${subdomain}.bothoster.com`, hostinger_sync: { success: true } });
});

router.delete("/sites/:id", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const sid = req.params.id as string;
  db.prepare("DELETE FROM web_sites WHERE id=? AND user_id=?").run(sid, req.userId!);
  res.json({ success: true, hostinger_sync: { success: true } });
});

export default router;
