import { Router } from "express";
import { db, genId } from "../lib/sqldb.js";
import { signToken, hashPassword, checkPassword } from "../lib/auth.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

router.post("/register", (req, res): void => {
  if (!db) { res.status(503).json({ error: "Base de données non disponible" }); return; }
  const { email, password, name } = req.body || {};
  if (!email || !password) { res.status(400).json({ error: "Email et mot de passe requis" }); return; }
  const existing = db.prepare("SELECT id FROM users WHERE email=?").get(email.toLowerCase());
  if (existing) { res.status(409).json({ error: "Email déjà utilisé" }); return; }
  const count: any = db.prepare("SELECT COUNT(*) as c FROM users").get();
  const role = (count?.c || 0) === 0 ? "admin" : "user";
  const id = genId();
  const hash = hashPassword(password);
  db.prepare("INSERT INTO users(id,email,password_hash,name,role) VALUES(?,?,?,?,?)").run(id, email.toLowerCase(), hash, name || email.split("@")[0], role);
  const user: any = db.prepare("SELECT id,email,name,role,created_at FROM users WHERE id=?").get(id);
  const token = signToken(id);
  res.status(201).json({ token, user });
});

router.post("/login", (req, res): void => {
  if (!db) { res.status(503).json({ error: "Base de données non disponible" }); return; }
  const { email, password } = req.body || {};
  if (!email || !password) { res.status(400).json({ error: "Email et mot de passe requis" }); return; }
  const user: any = db.prepare("SELECT * FROM users WHERE email=?").get(email.toLowerCase());
  if (!user || !checkPassword(password, user.password_hash)) {
    res.status(401).json({ error: "Identifiants invalides" }); return;
  }
  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, created_at: user.created_at } });
});

router.get("/me", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "Base de données non disponible" }); return; }
  const user: any = db.prepare("SELECT id,email,name,role,created_at FROM users WHERE id=?").get(req.userId);
  if (!user) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }
  res.json(user);
});

router.put("/profile", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "Base de données non disponible" }); return; }
  const { name, email } = req.body || {};
  if (email) {
    const existing: any = db.prepare("SELECT id FROM users WHERE email=? AND id!=?").get(email.toLowerCase(), req.userId!);
    if (existing) { res.status(409).json({ error: "Email déjà utilisé" }); return; }
    db.prepare("UPDATE users SET email=?,name=? WHERE id=?").run(email.toLowerCase(), name || "", req.userId);
  } else if (name) {
    db.prepare("UPDATE users SET name=? WHERE id=?").run(name, req.userId);
  }
  const user: any = db.prepare("SELECT id,email,name,role,created_at FROM users WHERE id=?").get(req.userId);
  res.json(user);
});

router.put("/password", authMiddleware, (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "Base de données non disponible" }); return; }
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) { res.status(400).json({ error: "Champs requis" }); return; }
  const user: any = db.prepare("SELECT * FROM users WHERE id=?").get(req.userId);
  if (!user || !checkPassword(current_password, user.password_hash)) {
    res.status(401).json({ error: "Mot de passe actuel incorrect" }); return;
  }
  db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(hashPassword(new_password), req.userId);
  res.json({ success: true });
});

export default router;
