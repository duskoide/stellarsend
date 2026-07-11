// JWT auth middleware using Hono's built-in jwt helpers.

import type { MiddlewareHandler } from "hono";
import { verify, sign } from "hono/jwt";
import type { AppContext } from "../env.js";
import { unauthorized } from "../utils/errors.js";

// hono/jwt's sign/verify expect a payload with a string index signature.
export interface JwtPayload {
  sub: string; // userId
  role: "SENDER" | "RECEIVER";
  exp: number;
  [key: string]: unknown;
}

export async function issueToken(
  secret: string,
  userId: string,
  role: "SENDER" | "RECEIVER",
): Promise<string> {
  const payload: JwtPayload = {
    sub: userId,
    role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
  };
  return sign(payload, secret, "HS256");
}

export const authMiddleware: MiddlewareHandler<AppContext> = async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    throw unauthorized("Missing bearer token");
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = (await verify(token, c.env.JWT_SECRET, "HS256")) as unknown as JwtPayload;
    c.set("userId", payload.sub);
    c.set("userRole", payload.role);
  } catch {
    throw unauthorized("Invalid or expired token");
  }
  await next();
};
