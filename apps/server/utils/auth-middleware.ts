import type { Context } from "hono";
import jwt from "jsonwebtoken";

export type JwtPayload = {
  userId: string;
  email?: string;
  iat?: number;
  exp?: number;
};

export async function authMiddleware(c: Context, next: () => Promise<void>) {
  const auth = c.req.header("Authorization") || c.req.header("authorization");

  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const parts = auth.split(" ");
  if (parts.length !== 2)
    return c.json({ error: "Invalid Authorization header" }, 401);

  const token = parts[1];

  if (!token) return c.json({ error: "Invalid Autorization header" }, 401);
  const secret = process.env.JWT_SECRET;
  if (!secret) return c.json({ error: "Server misconfiguration" }, 500);
  try {
    const payload = jwt.verify(token, secret) as Record<string, unknown>;
    c.set("user", payload as JwtPayload);
    await next();
  } catch (err) {
    return c.json({ error: "Invalid token" }, 401);
  }
}

export default authMiddleware;
