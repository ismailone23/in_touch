import { Hono } from "hono";
import authMiddleware, { type JwtPayload } from "../utils/auth-middleware";
import { db, friends, users } from "@repo/db";
import { and, eq, or } from "drizzle-orm";
import { sendFriendRequestEmail } from "../services/notification-mail";
import { sendToUser } from "../index";

type Variables = {
  user: JwtPayload;
};

const app = new Hono<{ Variables: Variables }>();

app.use("*", authMiddleware);

// Send friend request
app.post("/request", async (c) => {
  const user = c.get("user");
  const { email } = await c.req.json();

  if (!email) {
    return c.json({ error: "Email is required" }, 400);
  }

  const [targetUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (!targetUser) {
    return c.json({ error: "No user found with that email" }, 404);
  }

  if (user.userId === targetUser.id) {
    return c.json({ error: "You cannot send a request to yourself" }, 400);
  }

  // Check if already friends or request pending
  const existing = await db
    .select()
    .from(friends)
    .where(
      or(
        and(
          eq(friends.userId, user.userId),
          eq(friends.friendId, targetUser.id),
        ),
        and(
          eq(friends.userId, targetUser.id),
          eq(friends.friendId, user.userId),
        ),
      ),
    );

  if (existing.length) {
    const status = existing[0]?.status;
    if (status === "accepted") {
      return c.json({ error: "You are already friends with this user" }, 400);
    }
    return c.json({ error: "A friend request is already pending" }, 400);
  }

  // Get requester info for notification
  const [requester] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.userId));

  const newRequest = await db
    .insert(friends)
    .values({
      userId: user.userId,
      friendId: targetUser.id,
      status: "pending",
    })
    .returning();

  // Send real-time WebSocket notification to the recipient
  sendToUser(targetUser.id, {
    type: "friend_request",
    data: {
      id: newRequest[0]!.id,
      userId: user.userId,
      requesterName: requester?.name || "Someone",
      requesterEmail: requester?.email || "",
      createdAt: newRequest[0]!.createdAt?.toISOString() || new Date().toISOString(),
    },
  });

  // Send email notification (fire and forget)
  sendFriendRequestEmail(
    targetUser.email,
    requester?.name || "A user",
    user.userId,
  ).catch((err) => console.error("Failed to send email:", err));

  return c.json(newRequest[0]);
});

// Accept friend request
app.post("/accept", async (c) => {
  const user = c.get("user");
  const { friendId } = await c.req.json();

  if (!friendId) {
    return c.json({ error: "Friend ID is required" }, 400);
  }

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

  // Get both users' info for WS notification
  const [acceptor] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.userId));

  // Notify the original requester that their request was accepted
  sendToUser(friendId, {
    type: "friend_accepted",
    data: {
      id: updated[0]!.id,
      userId: user.userId,
      friendId: friendId,
      friendName: acceptor?.name || "Someone",
      friendEmail: acceptor?.email || "",
      status: "accepted",
    },
  });

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

  // Notify the other user
  sendToUser(friendId, {
    type: "friend_removed",
    data: { userId: user.userId },
  });

  return c.json({ message: "Relation removed" });
});

// Get all friends (bidirectional — works regardless of who sent the request)
app.get("/list", async (c) => {
  const user = c.get("user");

  // Friends where current user sent the request
  const sentList = await db
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

  // Friends where current user received the request
  const receivedList = await db
    .select({
      id: friends.id,
      userId: friends.friendId, // swap so friendId always = the other person
      friendId: friends.userId,
      status: friends.status,
      friendName: users.name,
      friendEmail: users.email,
    })
    .from(friends)
    .innerJoin(users, eq(friends.userId, users.id))
    .where(
      and(eq(friends.friendId, user.userId), eq(friends.status, "accepted")),
    );

  return c.json([...sentList, ...receivedList]);
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
