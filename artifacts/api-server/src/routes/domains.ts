import { Router } from "express";
import { db, genId } from "../lib/sqldb.js";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

router.get("/check", authMiddleware, async (_req: AuthRequest, res): Promise<void> => {
  const domain = _req.query.domain as string;
  if (!domain) { res.status(400).json({ error: "domain requis" }); return; }
  res.json({ domain, available: null, message: "Vérification manuelle requise" });
});

router.get("/", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  res.json(db.prepare("SELECT * FROM domains WHERE user_id=? ORDER BY created_at DESC").all(req.userId!));
});

router.post("/", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const { name, tld, expires_at } = req.body || {};
  if (!name) { res.status(400).json({ error: "Nom requis" }); return; }
  const id = genId();
  db.prepare("INSERT INTO domains(id,user_id,name,tld,expires_at) VALUES(?,?,?,?,?)").run(id, req.userId, name.trim().toLowerCase(), tld || ".com", expires_at || null);
  res.json(db.prepare("SELECT * FROM domains WHERE id=?").get(id));
});

router.delete("/:id", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const did = req.params.id as string;
  db.prepare("DELETE FROM domains WHERE id=? AND user_id=?").run(did, req.userId!);
  res.json({ success: true });
});

router.get("/:id/records", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const did = req.params.id as string;
  res.json(db.prepare("SELECT * FROM dns_records WHERE domain_id=? ORDER BY created_at").all(did));
});

router.post("/:id/records", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const did = req.params.id as string;
  const { type, name, value, ttl } = req.body || {};
  if (!type || !name || !value) { res.status(400).json({ error: "type, name et value requis" }); return; }
  const id = genId();
  db.prepare("INSERT INTO dns_records(id,domain_id,user_id,type,name,value,ttl) VALUES(?,?,?,?,?,?,?)").run(id, did, req.userId, type, name, value, ttl || 3600);
  res.json(db.prepare("SELECT * FROM dns_records WHERE id=?").get(id));
});

router.delete("/:id/records/:recordId", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const did = req.params.id as string;
  const rid = req.params.recordId as string;
  db.prepare("DELETE FROM dns_records WHERE id=? AND domain_id=?").run(rid, did);
  res.json({ success: true });
});

export const domainOrdersRouter = Router();

domainOrdersRouter.post("/", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const { domain, client_name, client_email } = req.body || {};
  if (!domain || !client_name || !client_email) { res.status(400).json({ error: "Champs requis" }); return; }
  const id = genId();
  const cmd_id = `CMD-${Date.now()}`;
  db.prepare("INSERT INTO domain_orders(id,cmd_id,user_id,domain,client_name,client_email) VALUES(?,?,?,?,?,?)").run(id, cmd_id, req.userId, domain, client_name, client_email);
  res.status(201).json(db.prepare("SELECT * FROM domain_orders WHERE id=?").get(id));
});

domainOrdersRouter.get("/", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  res.json(db.prepare("SELECT * FROM domain_orders WHERE user_id=? ORDER BY created_at DESC").all(req.userId!));
});

domainOrdersRouter.get("/:id/records", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const oid = req.params.id as string;
  const order: any = db.prepare("SELECT * FROM domain_orders WHERE id=? AND user_id=?").get(oid, req.userId!);
  if (!order) { res.status(404).json({ error: "Commande introuvable" }); return; }
  res.json(db.prepare("SELECT * FROM dns_records WHERE domain_id=? ORDER BY created_at").all(oid));
});

domainOrdersRouter.post("/:id/records", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const oid = req.params.id as string;
  const order: any = db.prepare("SELECT * FROM domain_orders WHERE id=? AND user_id=?").get(oid, req.userId!);
  if (!order) { res.status(404).json({ error: "Commande introuvable" }); return; }
  const { type, name, value, ttl } = req.body || {};
  if (!type || !name || !value) { res.status(400).json({ error: "type, name et value requis" }); return; }
  const id = genId();
  db.prepare("INSERT INTO dns_records(id,domain_id,user_id,type,name,value,ttl) VALUES(?,?,?,?,?,?,?)").run(id, oid, req.userId, type, name, value, ttl || 3600);
  res.json(db.prepare("SELECT * FROM dns_records WHERE id=?").get(id));
});

domainOrdersRouter.delete("/:id/records/:recordId", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const oid = req.params.id as string;
  const rid = req.params.recordId as string;
  db.prepare("DELETE FROM dns_records WHERE id=? AND domain_id=?").run(rid, oid);
  res.json({ success: true });
});

export const adminDomainOrdersRouter = Router();
adminDomainOrdersRouter.use(authMiddleware, adminMiddleware);

adminDomainOrdersRouter.get("/", (_req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  res.json(db.prepare("SELECT * FROM domain_orders ORDER BY created_at DESC").all());
});

adminDomainOrdersRouter.patch("/:id/deliver", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const oid = req.params.id as string;
  db.prepare("UPDATE domain_orders SET status='delivered' WHERE id=?").run(oid);
  res.json(db.prepare("SELECT * FROM domain_orders WHERE id=?").get(oid));
});

adminDomainOrdersRouter.patch("/:id/dns", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const oid = req.params.id as string;
  const { dns1, dns2 } = req.body || {};
  db.prepare("UPDATE domain_orders SET dns1=?,dns2=? WHERE id=?").run(dns1, dns2, oid);
  res.json(db.prepare("SELECT * FROM domain_orders WHERE id=?").get(oid));
});

adminDomainOrdersRouter.delete("/:id", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const oid = req.params.id as string;
  db.prepare("DELETE FROM domain_orders WHERE id=?").run(oid);
  res.json({ success: true });
});

export default router;
