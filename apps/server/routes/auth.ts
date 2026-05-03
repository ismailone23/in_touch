import { Hono } from "hono";
import { db, users } from "@repo/db";
import { and, eq, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  sendPasswordResetMail,
  sendVerificationMail,
} from "../services/verification-mail";
import jwt from "jsonwebtoken";
import { deleteCookie, setCookie } from "hono/cookie";

const app = new Hono();

const frontendBaseUrl =
  process.env.FRONTEND_BASE_URL ||
  process.env.BaseURL ||
  "http://localhost:3000";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 60 * 60 * 24 * 7,
  path: "/",
} as const;

app.post("/register", async (c) => {
  const { name, email, password } = await c.req.json();
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const trimmedPassword = typeof password === "string" ? password.trim() : "";

  if (!normalizedName || !normalizedEmail || !trimmedPassword) {
    return c.json({ error: "Name, email, and password are required" }, 400);
  }

  if (trimmedPassword.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail));
  if (existing.length) {
    return c.json({ error: "User already exists" }, 400);
  }
  try {
    const hashed = await bcrypt.hash(trimmedPassword, 10);
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    await db.insert(users).values({
      email: normalizedEmail,
      name: normalizedName,
      password: hashed,
      verificationToken: token,
      verificationTokenExpiry: expiry,
    });

    console.log(`Verify: ${frontendBaseUrl}/verify?token=${token}`);

    await sendVerificationMail(email, token);
    return c.json({ message: "Check your email to verify account" });
  } catch (e) {
    throw new Error("Server Error");
  }
});

app.get("/verify", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.redirect(`${frontendBaseUrl}/verify?error=missing_token`);
  }

  return c.redirect(
    `${frontendBaseUrl}/verify?token=${encodeURIComponent(token)}`,
  );
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
        eq(users.isVerified, false),
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

app.post("/forgot-password", async (c) => {
  const { email } = await c.req.json();
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";

  if (!normalizedEmail) {
    return c.json({ error: "Email is required" }, 400);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail));

  // Return the same response to avoid leaking which emails are registered.
  if (!user || !user.isVerified) {
    return c.json({
      message:
        "If this email is registered, a password reset link has been sent.",
    });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 1000 * 60 * 30); // 30 minutes

  await db
    .update(users)
    .set({
      verificationToken: token,
      verificationTokenExpiry: expiry,
    })
    .where(eq(users.id, user.id));

  await sendPasswordResetMail(user.email, token);

  return c.json({
    message:
      "If this email is registered, a password reset link has been sent.",
  });
});

app.post("/reset-password", async (c) => {
  const { token, password } = await c.req.json();

  if (!token || !password) {
    return c.json({ error: "Token and password are required" }, 400);
  }

  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
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

  const hashed = await bcrypt.hash(password, 10);

  await db
    .update(users)
    .set({
      password: hashed,
      verificationToken: null,
      verificationTokenExpiry: null,
    })
    .where(eq(users.id, user.id));

  return c.json({ message: "Password reset successful" });
});

app.post("/login", async (c) => {
  const { email, password } = await c.req.json();

  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : "";
  const trimmedPassword = typeof password === "string" ? password.trim() : "";

  if (!normalizedEmail || !trimmedPassword) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail));
  if (!user.length) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const u = user[0];
  if (!u) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  if (!u.isVerified) {
    return c.json({ error: "Please verify your email first" }, 403);
  }

  const valid = await bcrypt.compare(trimmedPassword, u.password);
  if (!valid) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = jwt.sign({ userId: u.id }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });

  setCookie(c, "token", token, cookieOptions);

  return c.json({
    success: true,
    user: {
      id: u.id,
      name: u.name,
      email: u.email,
    },
  });
});

app.post("/logout", async (c) => {
  deleteCookie(c, "token", { path: "/" });
  return c.json({ success: true });
});

export default app;
