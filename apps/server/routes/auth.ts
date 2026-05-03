import { Hono } from "hono";
import { db, users } from "@repo/db";
import { and, eq, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationMail } from "../services/verification-mail";
import jwt from "jsonwebtoken";
const app = new Hono();

app.post("/register", async (c) => {
  const { name, email, password } = await c.req.json();
  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length) {
    return c.json({ error: "User already exists" }, 400);
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await db.insert(users).values({
      email,
      name,
      password: hashed,
      verificationToken: token,
      verificationTokenExpiry: expiry,
    });

    console.log(`Verify: ${process.env.BaseURL}/auth/verify?token=${token}`);

    await sendVerificationMail(email, token);
    return c.json({ message: "Check your email to verify account" });
  } catch (e) {
    throw new Error("Server Error");
  }
});

app.post("/verify", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.json({ error: "Invalid Token" }, 400);
  }
  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.verificationToken, token),
        gt(users.verificationTokenExpiry, new Date()),
      ),
    );
  if (!user) {
    return c.json({ error: "Invalid or expired token" }, 400);
  }
  await db
    .update(users)
    .set({
      isVerified: true,
      verificationToken: null,
      verificationTokenExpiry: null,
    })
    .where(eq(users.id, user.id));

  return c.text("Account verified 🎉");
});

app.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  const user = await db.select().from(users).where(eq(users.email, email));
  if (!user.length) {
    return c.json({ error: "Invalid credentials" }, 401);
  }
  const u = user[0];
  if (u) {
    if (!u.isVerified) {
      return c.json({ error: "Please verify your email first" }, 403);
    }
    const valid = await bcrypt.compare(password, u.password);
    if (!valid) {
      return c.json({ error: "Invalid credentials" }, 401);
    }
    const token = jwt.sign({ userId: u.id }, process.env.JWT_SECRET!, {
      expiresIn: "7d",
    });
    return c.json({ token });
  } else {
    return c.json({ error: "Internal Server Error" }, 500);
  }
});

export default app;
