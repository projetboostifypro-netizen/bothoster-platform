import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth.js";
import { db } from "../lib/sqldb.js";

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token requis" });
    return;
  }
  const token = header.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Token invalide ou expiré" });
    return;
  }
  req.userId = payload.userId;
  if (db) {
    const user: any = db.prepare("SELECT role FROM users WHERE id=?").get(payload.userId);
    req.userRole = user?.role || "user";
  }
  next();
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== "admin") {
    res.status(403).json({ error: "Accès admin requis" });
    return;
  }
  next();
}
