import { Router } from "express";
import { db } from "../lib/sqldb.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

router.get("/", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const limit = Math.min(parseInt(req.query.limit as string) || 200, 1000);
  const logs = db
    .prepare("SELECT bl.* FROM bot_logs bl JOIN bots b ON b.id=bl.bot_id WHERE b.user_id=? ORDER BY bl.created_at DESC LIMIT ?")
    .all(req.userId!, limit);
  res.json(logs.reverse());
});

export default router;
