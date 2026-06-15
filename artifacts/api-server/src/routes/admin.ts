import { Router } from "express";
import { db, genId } from "../lib/sqldb.js";
import { authMiddleware, adminMiddleware, type AuthRequest } from "../middlewares/auth.js";
import { activeBots } from "../lib/botManager.js";

const router = Router();
router.use(authMiddleware, adminMiddleware);

router.get("/users", (_req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const users = db.prepare(`
    SELECT u.id, u.email, u.name, u.role, u.created_at,
           COALESCE(s.plan,'free') as plan,
           COALESCE(s.ram_limit,308) as ram_limit
    FROM users u
    LEFT JOIN subscriptions s ON s.user_id=u.id
    ORDER BY u.created_at DESC
  `).all();
  res.json(users);
});

router.get("/stats", (_req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const userCount: any = db.prepare("SELECT COUNT(*) as c FROM users").get();
  const botCount: any = db.prepare("SELECT COUNT(*) as c FROM bots").get();
  const onlineCount: any = db.prepare("SELECT COUNT(*) as c FROM bots WHERE status='running'").get();
  res.json({
    userCount: userCount?.c || 0,
    botCount: botCount?.c || 0,
    onlineCount: onlineCount?.c || 0,
    activeBots: activeBots.size,
  });
});

router.patch("/users/:userId/subscription", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const { plan, ram_limit } = req.body || {};
  const planLimits: Record<string, number> = { free: 308, standard: 700, pro: 1024, business: 4096 };
  const userId = req.params.userId as string;
  const existing: any = db.prepare("SELECT id FROM subscriptions WHERE user_id=?").get(userId);
  const ram = ram_limit || planLimits[plan] || 308;
  if (existing) {
    db.prepare("UPDATE subscriptions SET plan=?,ram_limit=? WHERE user_id=?").run(plan, ram, userId);
  } else {
    db.prepare("INSERT INTO subscriptions(id,user_id,plan,ram_limit) VALUES(?,?,?,?)").run(genId(), userId, plan, ram);
  }
  res.json(db.prepare("SELECT * FROM subscriptions WHERE user_id=?").get(userId));
});

export default router;
