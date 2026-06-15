import { Router } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/ping", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

export function startKeepAlive() {
  const domains = (process.env.REPLIT_DOMAINS || "").split(",").filter(Boolean);
  if (!domains.length) {
    logger.info("[keepalive] No REPLIT_DOMAINS — skipping self-ping");
    return;
  }
  const pingUrl = `https://${domains[0]}/api/ping`;
  logger.info({ url: pingUrl }, "[keepalive] Self-ping enabled every 4.5 minutes");

  setInterval(async () => {
    try {
      const res = await fetch(pingUrl, { signal: AbortSignal.timeout(10000) });
      logger.info({ status: res.status }, "[keepalive] ping OK");
    } catch (e: any) {
      logger.warn({ err: e?.message }, "[keepalive] ping failed");
    }
  }, 4.5 * 60 * 1000);
}

export default router;
