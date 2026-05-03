import type { Context } from "hono";
import jwt from "jsonwebtoken";
import { getCookie } from "hono/cookie";

export type JwtPayload = {
  userId: string;
  email?: string;
  iat?: number;
  exp?: number;
};

export default async function authMiddleware(c: Context, next: () => Promise<void>) {
  const token = getCookie(c, "token"); // 👈 read cookie

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return c.json({ error: "Server misconfiguration" }, 500);
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;

    c.set("user", payload); // attach user
    await next();
  } catch (err) {
    return c.json({ error: "Invalid token" }, 401);
  }
}