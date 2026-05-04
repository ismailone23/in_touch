import { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimiter } from "hono-rate-limiter";
import authApp from "./routes/auth";
import messageApp from "./routes/message";
import friendsApp from "./routes/friends";
import groupsApp from "./routes/groups";
import jwt from "jsonwebtoken";
import { db, groupMembers, messages } from "@repo/db";
import { eq } from "drizzle-orm";

const app = new Hono();

// Apply rate limiter
const limiter = rateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 100, // Limit each IP to 100 requests per window
  standardHeaders: "draft-6", // draft-6: RateLimit-* headers
  keyGenerator: (c) => c.req.header("x-forwarded-for") || c.req.header("cf-connecting-ip") || "anonymous",
  message: "Too many requests from this IP, please try again later."
});

app.use("*", limiter);

const allowedOrigins = (
  process.env.CORS_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) {
        return allowedOrigins[0] || "http://localhost:3000";
      }
      return allowedOrigins.includes(origin)
        ? origin
        : allowedOrigins[0] || "http://localhost:3000";
    },
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.get("/", (c) => {
  return c.json({ message: "API running" });
});

app.get("/me", (c) => {
  const token = readCookieValue(c.req.header("cookie"), "token");

  if (!token) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!);
    return c.json({ user: payload, token });
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
});

// Mount routes
app.route("/auth", authApp);
app.route("/messages", messageApp);
app.route("/friends", friendsApp);
app.route("/groups", groupsApp);

const port = Number(process.env.PORT) || 8080;

export const clients = new Map<string, Set<any>>();

function readCookieValue(
  cookieHeader: string | null | undefined,
  name: string,
) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((item) => item.trim());
  const match = cookies.find((item) => item.startsWith(`${name}=`));
  if (!match) {
    return null;
  }

  return decodeURIComponent(match.slice(name.length + 1));
}

function verifyUserId(token: string) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Missing JWT secret");
  }

  const payload = jwt.verify(token, secret) as { userId?: string };

  if (!payload.userId) {
    throw new Error("Invalid JWT payload");
  }

  return payload.userId;
}

function addClient(userId: string, ws: any) {
  const sockets = clients.get(userId) ?? new Set<any>();
  sockets.add(ws);
  clients.set(userId, sockets);
}

function removeClient(userId: string, ws: any) {
  const sockets = clients.get(userId);
  if (!sockets) {
    return;
  }

  sockets.delete(ws);

  if (sockets.size === 0) {
    clients.delete(userId);
  }
}

export function isUserOnline(userId: string): boolean {
  return clients.has(userId) && (clients.get(userId)?.size ?? 0) > 0;
}

export function getOnlineUserIds(): string[] {
  return Array.from(clients.keys());
}

function broadcastPresence(userId: string, status: "online" | "offline") {
  const payload = JSON.stringify({
    type: "presence_update",
    data: { userId, status },
  });

  clients.forEach((sockets, uid) => {
    if (uid === userId) return;
    sockets.forEach((socket) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
      }
    });
  });
}

export function sendToUser(userId: string, payload: unknown) {
  const sockets = clients.get(userId);
  if (!sockets) {
    return;
  }

  const serialized = JSON.stringify(payload);

  sockets.forEach((socket) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(serialized);
    }
  });
}

Bun.serve({
  port,
  hostname: "0.0.0.0",

  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/messages/ws" && req.method === "OPTIONS") {
      const origin = req.headers.get("origin") ?? "";
      const isAllowed = allowedOrigins.includes(origin);
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": isAllowed
            ? origin
            : (allowedOrigins[0] ?? ""),
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }

    if (url.pathname === "/messages/ws") {
      try {
        const token =
          url.searchParams.get("token") ||
          readCookieValue(req.headers.get("cookie"), "token");
        console.log("WS upgrade attempt, token present:", !!token); // add this

        if (!token) {
          console.log("WS rejected: no token"); // add this

          return new Response("Unauthorized", { status: 401 });
        }

        const userId = verifyUserId(token);
        console.log("WS upgrade for userId:", userId); // add this

        const origin = req.headers.get("origin") ?? "";
        const isAllowed = allowedOrigins.includes(origin);

        const upgraded = server.upgrade(req, {
          headers: {
            "Access-Control-Allow-Origin": isAllowed
              ? origin
              : (allowedOrigins[0] ?? ""),
            "Access-Control-Allow-Credentials": "true",
          },
          data: { userId } as any,
        });

        if (!upgraded) {
          return new Response("Upgrade failed", { status: 400 });
        }

        return;
      } catch {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    return app.fetch(req);
  },

  websocket: {
    open(ws: any) {
      console.log("WS connected");

      if (ws.data?.userId) {
        const wasOnline = isUserOnline(ws.data.userId);
        addClient(ws.data.userId, ws);

        // Broadcast online status to others (only if they were offline before)
        if (!wasOnline) {
          broadcastPresence(ws.data.userId, "online");
        }

        // Send current online users to this new connection
        const onlineUsers = getOnlineUserIds();
        ws.send(JSON.stringify({
          type: "presence_list",
          data: { onlineUsers },
        }));
      }
    },

    async message(ws: any, message) {
      const userId = ws.data?.userId;

      if (!userId) {
        ws.send(
          JSON.stringify({ type: "error", message: "Not authenticated" }),
        );
        ws.close();
        return;
      }

      let data: {
        type?: string;
        to?: string;
        groupId?: string;
        content?: string;
      };

      try {
        data = JSON.parse(message.toString()) as typeof data;
      } catch {
        ws.send(
          JSON.stringify({ type: "error", message: "Invalid message payload" }),
        );
        return;
      }

      if (!data.type) {
        ws.send(JSON.stringify({ type: "error", message: "Message type required" }));
        return;
      }

      // WebRTC Signaling
      if (
        data.type === "call_offer" ||
        data.type === "call_answer" ||
        data.type === "ice_candidate"
      ) {
        if (!data.to) return;
        // Forward the signaling message directly to the recipient
        sendToUser(data.to, {
          type: data.type,
          data: { ...data, from: userId },
        });
        return;
      }

      // Regular chat messages
      if (!data.content?.trim()) {
        ws.send(JSON.stringify({ type: "error", message: "Message content required" }));
        return;
      }

      if (data.type === "message") {
        if (!data.to) {
          ws.send(
            JSON.stringify({ type: "error", message: "Recipient required" }),
          );
          return;
        }

        const payload = {
          type: "message",
          data: {
            senderId: userId,
            receiverId: data.to,
            content: data.content,
            createdAt: new Date().toISOString(),
          },
        };

        sendToUser(userId, payload);
        sendToUser(data.to, payload);

        db.insert(messages)
          .values({
            senderId: userId,
            receiverId: data.to,
            content: data.content,
          })
          .catch(console.error);
      }

      if (data.type === "group_message") {
        if (!data.groupId) {
          ws.send(JSON.stringify({ type: "error", message: "Group required" }));
          return;
        }

        const payload = {
          type: "group_message",
          data: {
            senderId: userId,
            groupId: data.groupId,
            content: data.content,
            createdAt: new Date().toISOString(),
          },
        };

        const members = await db
          .select({ userId: groupMembers.userId })
          .from(groupMembers)
          .where(eq(groupMembers.groupId, data.groupId));

        members.forEach(({ userId: memberId }) => {
          sendToUser(memberId, payload);
        });

        db.insert(messages)
          .values({
            senderId: userId,
            groupId: data.groupId,
            content: data.content,
          })
          .catch(console.error);
      }
    },

    close(ws: any) {
      if (ws.data?.userId) {
        removeClient(ws.data.userId, ws);

        // Broadcast offline status (only if fully disconnected)
        if (!isUserOnline(ws.data.userId)) {
          broadcastPresence(ws.data.userId, "offline");
        }
      }
      console.log("WS disconnected");
    },
  },
});

console.log(`🚀 Server running on ${port}`);
