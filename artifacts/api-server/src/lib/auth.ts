import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createRequire } from "module";
import { DATA_DIR } from "./sqldb.js";

const require = createRequire(import.meta.url);

const SECRET_FILE = path.join(DATA_DIR, ".jwt_secret");

let JWT_SECRET: string;
if (process.env.JWT_SECRET) {
  JWT_SECRET = process.env.JWT_SECRET;
} else if (fs.existsSync(SECRET_FILE)) {
  JWT_SECRET = fs.readFileSync(SECRET_FILE, "utf8").trim();
} else {
  JWT_SECRET = crypto.randomBytes(48).toString("hex");
  try {
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, JWT_SECRET);
  } catch {}
}

let jwt: any;
let bcrypt: any;
try {
  jwt = require("jsonwebtoken");
} catch {
  jwt = null;
}
try {
  bcrypt = require("bcryptjs");
} catch {
  bcrypt = null;
}

export function signToken(userId: string): string {
  if (!jwt) return "no-jwt";
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { userId: string } | null {
  if (!jwt) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export function hashPassword(p: string): string {
  if (!bcrypt) return p;
  return bcrypt.hashSync(p, 10);
}

export function checkPassword(plain: string, hash: string): boolean {
  if (!bcrypt) return plain === hash;
  return bcrypt.compareSync(plain, hash);
}
