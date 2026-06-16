'use strict';
const crypto = require('crypto');

// ── In-memory store (persists for the container lifetime) ──────────────────
const users = new Map();
let userCount = 0;

// ── Minimal JWT (no external dependency) ───────────────────────────────────
const SECRET = process.env.JWT_SECRET || 'bothoster-secret-change-in-prod';

function createToken(userId) {
  const h = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({ userId, exp: Math.floor(Date.now() / 1000) + 30 * 24 * 3600 })).toString('base64url');
  const s = crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url');
  return h + '.' + p + '.' + s;
}

function verifyToken(token) {
  try {
    const [h, p, s] = token.split('.');
    const expected = crypto.createHmac('sha256', SECRET).update(h + '.' + p).digest('base64url');
    if (s !== expected) return null;
    const data = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch { return null; }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return salt + ':' + hash;
}

function checkPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  try {
    const inp = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), inp);
  } catch { return false; }
}

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') { resolve(req.body); return; }
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
  });
}

// ── Handler ─────────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const route = (req.url || '').replace(/^/api/, '').split('?')[0];
  const body = await parseBody(req);

  // POST /auth/register
  if (req.method === 'POST' && route === '/auth/register') {
    const { email, password, name } = body;
    if (!email || !password) { res.status(400).json({ error: 'Email et mot de passe requis' }); return; }
    const key = email.toLowerCase();
    if (users.has(key)) { res.status(409).json({ error: 'Email déjà utilisé' }); return; }
    const id = crypto.randomUUID();
    const role = userCount === 0 ? 'admin' : 'user';
    const user = { id, email: key, name: name || key.split('@')[0], role, created_at: new Date().toISOString() };
    users.set(key, { ...user, password_hash: hashPassword(password) });
    userCount++;
    res.status(201).json({ token: createToken(id), user });
    return;
  }

  // POST /auth/login
  if (req.method === 'POST' && route === '/auth/login') {
    const { email, password } = body;
    if (!email || !password) { res.status(400).json({ error: 'Email et mot de passe requis' }); return; }
    const stored = users.get((email || '').toLowerCase());
    if (!stored || !checkPassword(password, stored.password_hash)) {
      res.status(401).json({ error: 'Identifiants invalides' }); return;
    }
    const { password_hash, ...user } = stored;
    res.json({ token: createToken(stored.id), user });
    return;
  }

  // GET /auth/me
  if (req.method === 'GET' && route === '/auth/me') {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) { res.status(401).json({ error: 'Token requis' }); return; }
    const payload = verifyToken(auth.slice(7));
    if (!payload) { res.status(401).json({ error: 'Token invalide' }); return; }
    for (const [, u] of users) {
      if (u.id === payload.userId) {
        const { password_hash, ...user } = u;
        res.json(user); return;
      }
    }
    res.status(404).json({ error: 'Utilisateur introuvable' });
    return;
  }

  // GET /healthz
  if (req.method === 'GET' && (route === '/healthz' || route === '')) {
    res.json({ status: 'ok', users: users.size }); return;
  }

  res.status(404).json({ error: 'Route non trouvée: ' + route });
};
