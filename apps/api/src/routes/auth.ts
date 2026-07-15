// Auth routes: register, login (JWT), SEP-10 challenge/token (self-custody, optional).

import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { AppContext } from "../env.js";
import { createDb, schema } from "../db/client.js";
import { issueToken } from "../middleware/auth.js";
import { badRequest, conflict, unauthorized } from "../utils/errors.js";
import { id } from "../utils/id.js";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "@stellarsend/shared";

const auth = new Hono<AppContext>();

// Hash password with WebCrypto (PBKDF2) — available in Workers.
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    key,
    256,
  );
  const hash = btoa(String.fromCharCode(...new Uint8Array(bits)));
  const saltStr = btoa(String.fromCharCode(...salt));
  return `${saltStr}:${hash}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltStr, hash] = stored.split(":");
  if (!saltStr || !hash) return false;
  const salt = Uint8Array.from(atob(saltStr), (ch) => ch.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" },
    key,
    256,
  );
  const candidate = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return candidate === hash;
}

function toUser(row: typeof schema.users.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    phone: row.phone,
    fullName: row.fullName,
    country: row.country,
    stellarPubKey: row.stellarPubKey,
    kycStatus: row.kycStatus as User["kycStatus"],
    createdAt: row.createdAt.getTime(),
  };
}

auth.post("/register", async (c) => {
  const body = await c.req.json<RegisterRequest>();
  if (!body.email || !body.password || !body.fullName) {
    throw badRequest("email, password, and fullName are required");
  }
  const db = createDb(c.env);
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, body.email))
    .get();
  if (existing) throw conflict("Email already registered");

  const row = {
    id: id("usr"),
    email: body.email,
    fullName: body.fullName,
    passwordHash: await hashPassword(body.password),
    country: body.country,
  };
  await db.insert(schema.users).values(row);
  const created = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, row.id))
    .get();

  const user = toUser(created!);
  const token = await issueToken(c.env.JWT_SECRET, user.id);
  return c.json<AuthResponse>({ token, user }, 201);
});

auth.post("/login", async (c) => {
  const body = await c.req.json<LoginRequest>();
  const db = createDb(c.env);
  const row = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, body.email))
    .get();
  if (!row || !(await verifyPassword(body.password, row.passwordHash))) {
    throw unauthorized("Invalid credentials");
  }
  const user = toUser(row);
  const token = await issueToken(c.env.JWT_SECRET, user.id);
  return c.json<AuthResponse>({ token, user });
});

// SEP-10 (self-custody) — optional, nice-to-have. Stubbed.
auth.post("/stellar/challenge", (c) =>
  c.json({ error: "not_implemented", message: "SEP-10 challenge TODO" }, 501),
);
auth.post("/stellar/token", (c) =>
  c.json({ error: "not_implemented", message: "SEP-10 verify TODO" }, 501),
);

export default auth;
