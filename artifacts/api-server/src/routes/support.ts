import { Router } from "express";
import { db, genId } from "../lib/sqldb.js";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

router.get("/", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  res.json(db.prepare("SELECT * FROM support_tickets WHERE user_id=? ORDER BY created_at DESC").all(req.userId!));
});

router.post("/", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const { subject, message } = req.body || {};
  if (!subject || !message) { res.status(400).json({ error: "subject et message requis" }); return; }
  const id = genId();
  db.prepare("INSERT INTO support_tickets(id,user_id,subject,message) VALUES(?,?,?,?)").run(id, req.userId, subject, message);
  res.status(201).json(db.prepare("SELECT * FROM support_tickets WHERE id=?").get(id));
});

router.get("/admin/tickets", authMiddleware, adminMiddleware, (_req, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  res.json(db.prepare("SELECT t.*,u.email,u.name FROM support_tickets t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC").all());
});

router.patch("/admin/tickets/:id", authMiddleware, adminMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const tid = req.params.id as string;
  const { reply, status } = req.body || {};
  db.prepare("UPDATE support_tickets SET reply=?,status=?,updated_at=datetime('now') WHERE id=?").run(reply || null, status || "open", tid);
  res.json(db.prepare("SELECT * FROM support_tickets WHERE id=?").get(tid));
});

export default router;
