import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { logger } from "./logger.js";

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
export const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, "bothoster.db");
export const BOTS_DIR = process.env.BOTS_DIR || path.join(DATA_DIR, "bots");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(BOTS_DIR, { recursive: true });

class SqliteDB {
  private _path: string;
  private _db: any;

  constructor(sqlInstance: any, dbPath: string) {
    this._path = dbPath;
    this._db = fs.existsSync(dbPath)
      ? new sqlInstance.Database(fs.readFileSync(dbPath))
      : new sqlInstance.Database();
  }

  private _save() {
    try {
      fs.writeFileSync(this._path, Buffer.from(this._db.export()));
    } catch (e: any) {
      logger.warn({ err: e }, "[db] save error");
    }
  }

  private _flat(args: any[]): any[] {
    if (!args.length) return [];
    if (args.length === 1 && Array.isArray(args[0])) return args[0];
    return args.map((v) => (v === undefined ? null : v));
  }

  pragma(str: string) {
    try {
      this._db.run(`PRAGMA ${str}`);
    } catch {}
  }

  exec(sql: string) {
    this._db.exec(sql);
    this._save();
  }

  prepare(sql: string) {
    const self = this;
    return {
      run(...args: any[]) {
        const p = self._flat(args);
        try {
          self._db.run(sql, p.length ? p : undefined);
        } catch (e: any) {
          logger.warn({ err: e }, `[db] run: ${sql.slice(0, 60)}`);
          throw e;
        }
        self._save();
        return { changes: self._db.getRowsModified() };
      },
      get(...args: any[]) {
        const p = self._flat(args);
        try {
          const stmt = self._db.prepare(sql);
          if (p.length) stmt.bind(p);
          const row = stmt.step() ? stmt.getAsObject() : undefined;
          stmt.free();
          return row;
        } catch (e: any) {
          logger.warn({ err: e }, `[db] get: ${sql.slice(0, 60)}`);
          return undefined;
        }
      },
      all(...args: any[]) {
        const p = self._flat(args);
        try {
          const stmt = self._db.prepare(sql);
          if (p.length) stmt.bind(p);
          const rows: any[] = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          return rows;
        } catch (e: any) {
          logger.warn({ err: e }, `[db] all: ${sql.slice(0, 60)}`);
          return [];
        }
      },
    };
  }
}

export let db: SqliteDB | null = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bots (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    platform TEXT DEFAULT 'discord',
    language TEXT DEFAULT 'nodejs',
    status TEXT DEFAULT 'stopped',
    source_type TEXT DEFAULT 'upload',
    source_url TEXT,
    env_vars TEXT DEFAULT '{}',
    cpu_usage REAL DEFAULT 0,
    ram_usage REAL DEFAULT 0,
    uptime_seconds INTEGER DEFAULT 0,
    last_started_at TEXT,
    updated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS bot_files (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    path TEXT NOT NULL,
    content TEXT,
    is_modified INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(bot_id, path)
  );
  CREATE TABLE IF NOT EXISTS bot_logs (
    id TEXT PRIMARY KEY,
    bot_id TEXT NOT NULL,
    user_id TEXT,
    level TEXT DEFAULT 'info',
    message TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'free',
    ram_limit INTEGER DEFAULT 308,
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS domains (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    tld TEXT DEFAULT '.com',
    status TEXT DEFAULT 'active',
    nameserver1 TEXT DEFAULT 'ns1.bothoster.com',
    nameserver2 TEXT DEFAULT 'ns2.bothoster.com',
    expires_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS dns_records (
    id TEXT PRIMARY KEY,
    domain_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    ttl INTEGER DEFAULT 3600,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS domain_orders (
    id TEXT PRIMARY KEY,
    cmd_id TEXT NOT NULL UNIQUE,
    user_id TEXT,
    domain TEXT NOT NULL,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    dns1 TEXT DEFAULT 'ns1.bothoster.com',
    dns2 TEXT DEFAULT 'ns2.bothoster.com',
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS web_sites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    subdomain TEXT NOT NULL UNIQUE,
    custom_domain TEXT,
    stack TEXT DEFAULT 'HTML / CSS',
    status TEXT DEFAULT 'deploying',
    github_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS credits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    balance INTEGER DEFAULT 0,
    auto_recharge INTEGER DEFAULT 0,
    auto_recharge_threshold INTEGER DEFAULT 100,
    auto_recharge_amount INTEGER DEFAULT 500,
    updated_at TEXT DEFAULT (datetime('now')),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS credit_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    reference TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    reply TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

export async function initDb(): Promise<void> {
  try {
    const initSqlJs = require("sql.js");
    logger.info("[db] Loading sql.js...");
    const SQL = await initSqlJs();
    const sqliteDB = new SqliteDB(SQL, DB_PATH);
    sqliteDB.pragma("journal_mode = WAL");
    sqliteDB.pragma("foreign_keys = ON");
    sqliteDB.exec(SCHEMA);
    try {
      sqliteDB.prepare("ALTER TABLE credit_transactions ADD COLUMN reference TEXT").run();
    } catch {}
    db = sqliteDB;
    logger.info({ path: DB_PATH }, "[db] Database ready");
  } catch (e: any) {
    logger.error({ err: e }, "[db] Init error");
  }
}

export function genId(): string {
  return crypto.randomUUID();
}

export function normalizeBot(row: any) {
  if (!row) return null;
  try {
    row.env_vars =
      typeof row.env_vars === "string"
        ? JSON.parse(row.env_vars)
        : row.env_vars || {};
  } catch {
    row.env_vars = {};
  }
  return row;
}
