import { Router } from "express";
import { db, genId } from "../lib/sqldb.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

const PLAN_LIMITS: Record<string, number> = { free: 308, standard: 700, pro: 1024, business: 4096 };

router.get("/", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  let sub: any = db.prepare("SELECT * FROM subscriptions WHERE user_id=?").get(req.userId!);
  if (!sub) {
    db.prepare("INSERT INTO subscriptions(id,user_id,plan,ram_limit) VALUES(?,?,?,?)").run(genId(), req.userId, "free", 308);
    sub = db.prepare("SELECT * FROM subscriptions WHERE user_id=?").get(req.userId!);
  }
  res.json(sub);
});

router.post("/activate", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const { plan } = req.body || {};
  if (!plan || !PLAN_LIMITS[plan]) { res.status(400).json({ error: "Plan invalide" }); return; }
  const ram = PLAN_LIMITS[plan];
  const existing: any = db.prepare("SELECT id FROM subscriptions WHERE user_id=?").get(req.userId!);
  if (existing) {
    db.prepare("UPDATE subscriptions SET plan=?,ram_limit=? WHERE user_id=?").run(plan, ram, req.userId);
  } else {
    db.prepare("INSERT INTO subscriptions(id,user_id,plan,ram_limit) VALUES(?,?,?,?)").run(genId(), req.userId, plan, ram);
  }
  res.json(db.prepare("SELECT * FROM subscriptions WHERE user_id=?").get(req.userId!));
});

export default router;
