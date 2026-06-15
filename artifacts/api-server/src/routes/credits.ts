import { Router } from "express";
import { db, genId } from "../lib/sqldb.js";
import { authMiddleware, type AuthRequest } from "../middlewares/auth.js";

const router = Router();
router.use(authMiddleware);

const SOLEASPAY_API_KEY = process.env.SOLEASPAY_API_KEY || "f9N8wY8TD_8C7PvFsacmtmsH_MzozoU_Fkf-XhzkrG4-AP";
const SOLEASPAY_BASE = "https://soleaspay.com";

const CREDIT_PACKS: Record<string, { credits: number; price: number; label: string }> = {
  starter:  { credits: 500,  price: 5,  label: "Pack Starter — 500 crédits (5€)" },
  standard: { credits: 1100, price: 10, label: "Pack Standard — 1100 crédits (10€)" },
  pro:      { credits: 2800, price: 25, label: "Pack Pro — 2800 crédits (25€)" },
  max:      { credits: 6000, price: 50, label: "Pack Max — 6000 crédits (50€)" },
};

function getOrCreateCredits(userId: string) {
  if (!db) return null;
  let c: any = db.prepare("SELECT * FROM credits WHERE user_id=?").get(userId);
  if (!c) {
    db.prepare("INSERT INTO credits(id,user_id,balance) VALUES(?,?,0)").run(genId(), userId);
    c = db.prepare("SELECT * FROM credits WHERE user_id=?").get(userId);
  }
  return c;
}

function addTransaction(userId: string, amount: number, type: string, description: string, reference?: string) {
  if (!db) return;
  db.prepare("INSERT INTO credit_transactions(id,user_id,amount,type,description,reference) VALUES(?,?,?,?,?,?)").run(genId(), userId, amount, type, description, reference || null);
}

router.get("/", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const credits = getOrCreateCredits(req.userId!);
  const transactions = db.prepare("SELECT * FROM credit_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 50").all(req.userId!);
  res.json({ ...credits, transactions });
});

router.post("/purchase", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const { pack } = req.body || {};
  const chosen = CREDIT_PACKS[pack];
  if (!chosen) { res.status(400).json({ error: "Pack invalide" }); return; }
  getOrCreateCredits(req.userId!);
  db.prepare("UPDATE credits SET balance=balance+?,updated_at=datetime('now') WHERE user_id=?").run(chosen.credits, req.userId);
  addTransaction(req.userId!, chosen.credits, "purchase", chosen.label);
  res.json(db.prepare("SELECT * FROM credits WHERE user_id=?").get(req.userId));
});

router.post("/soleaspay-confirm", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const { pack, order_id, pay_id } = req.body || {};
  const chosen = CREDIT_PACKS[pack];
  if (!chosen) { res.status(400).json({ error: "Pack invalide" }); return; }
  if (!order_id) { res.status(400).json({ error: "order_id manquant" }); return; }
  const existing: any = db.prepare("SELECT id FROM credit_transactions WHERE user_id=? AND reference=?").get(req.userId!, order_id);
  if (existing) { res.status(409).json({ error: "Ce paiement a déjà été crédité" }); return; }
  getOrCreateCredits(req.userId!);
  db.prepare("UPDATE credits SET balance=balance+?,updated_at=datetime('now') WHERE user_id=?").run(chosen.credits, req.userId);
  const label = `${chosen.label} — SoleasPay ref: ${pay_id || order_id}`;
  addTransaction(req.userId!, chosen.credits, "purchase", label, order_id);
  const updated: any = db.prepare("SELECT * FROM credits WHERE user_id=?").get(req.userId);
  res.json({ ...updated, credited: chosen.credits });
});

router.post("/soleaspay-initiate", async (req: AuthRequest, res): Promise<void> => {
  try {
    const { wallet, amount, currency, order_id, description, payer, payerEmail, service, otp } = req.body || {};
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": SOLEASPAY_API_KEY,
      "operation": "2",
      "service": String(service),
    };
    if (otp) headers["otp"] = otp;
    const spRes = await fetch(`${SOLEASPAY_BASE}/api/agent/bills/v3`, {
      method: "POST",
      headers,
      body: JSON.stringify({ wallet, amount, currency, order_id, description, payer, payerEmail }),
    });
    const data = await spRes.json().catch(() => ({}));
    res.json(data);
  } catch (e: any) {
    res.status(502).json({ error: e?.message || "Erreur SoleasPay" });
  }
});

router.get("/soleaspay-verify", async (req: AuthRequest, res): Promise<void> => {
  try {
    const { orderId, payId, service } = req.query as Record<string, string>;
    const url = `${SOLEASPAY_BASE}/api/agent/verif-pay?orderId=${encodeURIComponent(orderId)}&payId=${encodeURIComponent(payId)}`;
    const spRes = await fetch(url, {
      method: "GET",
      headers: { "x-api-key": SOLEASPAY_API_KEY, "operation": "2", "service": String(service) },
    });
    const data = await spRes.json().catch(() => ({}));
    res.json(data);
  } catch (e: any) {
    res.status(502).json({ error: e?.message || "Erreur SoleasPay" });
  }
});

router.put("/auto-recharge", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const { auto_recharge, auto_recharge_threshold, auto_recharge_amount } = req.body || {};
  getOrCreateCredits(req.userId!);
  db.prepare("UPDATE credits SET auto_recharge=?,auto_recharge_threshold=?,auto_recharge_amount=?,updated_at=datetime('now') WHERE user_id=?").run(auto_recharge ? 1 : 0, auto_recharge_threshold ?? 100, auto_recharge_amount ?? 500, req.userId);
  res.json(db.prepare("SELECT * FROM credits WHERE user_id=?").get(req.userId));
});

router.post("/spend", (req: AuthRequest, res): void => {
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const { amount, description } = req.body || {};
  if (!amount || amount <= 0) { res.status(400).json({ error: "Montant invalide" }); return; }
  const credits: any = getOrCreateCredits(req.userId!);
  if (credits.balance < amount) {
    if (credits.auto_recharge && credits.balance + credits.auto_recharge_amount >= amount) {
      db.prepare("UPDATE credits SET balance=balance+?,updated_at=datetime('now') WHERE user_id=?").run(credits.auto_recharge_amount, req.userId);
      addTransaction(req.userId!, credits.auto_recharge_amount, "auto_recharge", `Recharge automatique de ${credits.auto_recharge_amount} crédits`);
    } else {
      res.status(400).json({ error: "Solde insuffisant" }); return;
    }
  }
  db.prepare("UPDATE credits SET balance=balance-?,updated_at=datetime('now') WHERE user_id=?").run(amount, req.userId);
  addTransaction(req.userId!, -amount, "spend", description || "Dépense de crédits");
  res.json(db.prepare("SELECT * FROM credits WHERE user_id=?").get(req.userId));
});

export default router;
