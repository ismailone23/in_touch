import { Hono } from "hono";
import authMiddleware, { type JwtPayload } from "../utils/auth-middleware";
import { db, messages, friends, groupMembers } from "@repo/db";
import { and, desc, eq, lt, or } from "drizzle-orm";

const clients = new Map<string, any>();

type Variables = {
  user: JwtPayload;
};
const app = new Hono<{ Variables: Variables }>();

app.use("*", authMiddleware);

app.post("/send", async (c) => {
  const body = await c.req.json();
  const user = c.get("user");

  const { receiverId, groupId, content } = body;

  if (!content) {
    return c.json({ error: "Message required" }, 400);
  }

  if (!receiverId && !groupId) {
    return c.json({ error: "receiverId or groupId required" }, 400);
  }

  const msg = await db
    .insert(messages)
    .values({
      senderId: user.userId,
      receiverId: receiverId || null,
      groupId: groupId || null,
      content,
    })
    .returning();

  return c.json(msg[0]);
});

app.get("/p2p/:userId", authMiddleware, async (c) => {
  const currentUser = c.get("user");
  const otherUserId = c.req.param("userId")!;

  // Check if they're friends
  const friendship = await db
    .select()
    .from(friends)
    .where(
      and(
        or(
          and(
            eq(friends.userId, currentUser.userId),
            eq(friends.friendId, otherUserId),
          ),
          and(
            eq(friends.userId, otherUserId),
            eq(friends.friendId, currentUser.userId),
          ),
        ),
        eq(friends.status, "accepted"),
      ),
    );

  if (!friendship.length) {
    return c.json({ error: "Not friends with this user" }, 403);
  }

  const limit = Number(c.req.query("limit")) || 20;
  const cursor = c.req.query("cursor");

  const p2pCondition = or(
    and(
      eq(messages.senderId, currentUser.userId),
      eq(messages.receiverId, otherUserId),
    ),
    and(
      eq(messages.senderId, otherUserId),
      eq(messages.receiverId, currentUser.userId),
    ),
  );

  const whereCondition = cursor
    ? and(p2pCondition, lt(messages.createdAt, new Date(cursor)))
    : p2pCondition;

  const query = db.select().from(messages).where(whereCondition);

  const msgs = await query.orderBy(desc(messages.createdAt)).limit(limit);

  return c.json({
    data: msgs,
    nextCursor: msgs.length ? msgs[msgs.length - 1]!.createdAt : null,
  });
});

app.get("/group/:groupId", async (c) => {
  const user = c.get("user");
  const groupId = c.req.param("groupId");

  const isMember = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.userId),
      ),
    );

  if (!isMember.length) {
    return c.json({ error: "Not a member of this group" }, 403);
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.groupId, groupId));

  return c.json(msgs);
});

app.get("/ws", (c) => {
  const result = (Bun as any).upgrade(c.req.raw);
  if (!result) {
    return c.json({ error: "WebSocket upgrade failed" }, 400);
  }

  const { socket, response } = result;

  let userId: string | null = null;

  socket.onmessage = async (event: MessageEvent) => {
    const data = JSON.parse(event.data as string);

    switch (data.type) {
      case "auth":
        userId = data.userId;
        if (userId) {
          clients.set(userId, socket);
          socket.send(JSON.stringify({ type: "auth", status: "connected" }));
        } else {
          socket.send(
            JSON.stringify({ type: "error", message: "userId required" }),
          );
        }
        break;

      case "message":
        if (!userId) {
          socket.send(
            JSON.stringify({ type: "error", message: "Not authenticated" }),
          );
          return;
        }

        const { to, content } = data;

        // Create payload with optimistic ID
        const payload = {
          type: "message",
          data: {
            senderId: userId,
            receiverId: to,
            content,
            createdAt: new Date(),
          },
        };

        // Send to receiver immediately (don't wait for DB)
        const target = clients.get(to);
        if (target) {
          target.send(JSON.stringify(payload));
        }

        // Echo back to sender immediately
        socket.send(JSON.stringify(payload));

        // Save to DB asynchronously in background (fire and forget)
        db.insert(messages)
          .values({
            senderId: userId,
            receiverId: to,
            content,
          })
          .catch((err) => console.error("Failed to save message:", err));
        break;

      case "group_message":
        if (!userId) {
          socket.send(
            JSON.stringify({ type: "error", message: "Not authenticated" }),
          );
          return;
        }

        const { groupId, content: groupContent } = data;

        // Create payload with optimistic data
        const broadcastPayload = {
          type: "group_message",
          data: {
            senderId: userId,
            groupId,
            content: groupContent,
            createdAt: new Date(),
          },
        };

        // Broadcast to all connected clients immediately (don't wait for DB)
        clients.forEach((socket) => {
          socket.send(JSON.stringify(broadcastPayload));
        });

        // Save to DB asynchronously in background (fire and forget)
        db.insert(messages)
          .values({
            senderId: userId,
            groupId,
            content: groupContent,
          })
          .catch((err) => console.error("Failed to save group message:", err));
        break;
    }
  };

  socket.onclose = () => {
    if (userId) clients.delete(userId);
  };

  return response;
});

export default app;
