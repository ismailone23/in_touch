import { Hono } from "hono";
import authMiddleware, { type JwtPayload } from "../utils/auth-middleware";
import { db, friends, users } from "@repo/db";
import { and, eq, or } from "drizzle-orm";

type Variables = {
  user: JwtPayload;
};

const app = new Hono<{ Variables: Variables }>();

app.use("*", authMiddleware);

// Send friend request
app.post("/request", async (c) => {
  const user = c.get("user");
  const { friendId } = await c.req.json();

  if (!friendId) {
    return c.json({ error: "friendId required" }, 400);
  }

  if (user.userId === friendId) {
    return c.json({ error: "Cannot add yourself" }, 400);
  }

  // Check if already friends or request pending
  const existing = await db
    .select()
    .from(friends)
    .where(
      or(
        and(eq(friends.userId, user.userId), eq(friends.friendId, friendId)),
        and(eq(friends.userId, friendId), eq(friends.friendId, user.userId)),
      ),
    );

  if (existing.length) {
    return c.json(
      { error: "Friend request already exists or already friends" },
      400,
    );
  }

  const newRequest = await db
    .insert(friends)
    .values({
      userId: user.userId,
      friendId,
      status: "pending",
    })
    .returning();

  return c.json(newRequest[0]);
});

// Accept friend request
app.post("/accept", async (c) => {
  const user = c.get("user");
  const { friendId } = await c.req.json();

  const request = await db
    .select()
    .from(friends)
    .where(
      and(
        eq(friends.userId, friendId),
        eq(friends.friendId, user.userId),
        eq(friends.status, "pending"),
      ),
    );

  if (!request.length) {
    return c.json({ error: "No pending request from this user" }, 404);
  }

  const updated = await db
    .update(friends)
    .set({ status: "accepted" })
    .where(eq(friends.id, request[0]!.id))
    .returning();

  return c.json(updated[0]);
});

// Reject/remove friend
app.post("/remove", async (c) => {
  const user = c.get("user");
  const { friendId } = await c.req.json();

  const relation = await db
    .select()
    .from(friends)
    .where(
      or(
        and(eq(friends.userId, user.userId), eq(friends.friendId, friendId)),
        and(eq(friends.userId, friendId), eq(friends.friendId, user.userId)),
      ),
    );

  if (!relation.length) {
    return c.json({ error: "No relation found" }, 404);
  }

  await db.delete(friends).where(eq(friends.id, relation[0]!.id));

  return c.json({ message: "Relation removed" });
});

// Get all friends
app.get("/list", async (c) => {
  const user = c.get("user");

  const friendsList = await db
    .select({
      id: friends.id,
      userId: friends.userId,
      friendId: friends.friendId,
      status: friends.status,
      friendName: users.name,
      friendEmail: users.email,
    })
    .from(friends)
    .innerJoin(users, eq(friends.friendId, users.id))
    .where(
      and(eq(friends.userId, user.userId), eq(friends.status, "accepted")),
    );

  return c.json(friendsList);
});

// Get pending requests
app.get("/requests", async (c) => {
  const user = c.get("user");

  const requests = await db
    .select({
      id: friends.id,
      userId: friends.userId,
      requesterName: users.name,
      requesterEmail: users.email,
      createdAt: friends.createdAt,
    })
    .from(friends)
    .innerJoin(users, eq(friends.userId, users.id))
    .where(
      and(eq(friends.friendId, user.userId), eq(friends.status, "pending")),
    );

  return c.json(requests);
});

export default app;
