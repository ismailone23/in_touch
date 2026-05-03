import { Hono } from "hono";
import { cors } from "hono/cors";
import authApp from "./routes/auth";
import messageApp from "./routes/message";
import friendsApp from "./routes/friends";
import groupsApp from "./routes/groups";
import jwt from "jsonwebtoken";
import { db, groupMembers, messages } from "@repo/db";
import { eq } from "drizzle-orm";

const app = new Hono();

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

const clients = new Map<string, Set<any>>();

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

function sendToUser(userId: string, payload: unknown) {
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

    if (url.pathname === "/messages/ws") {
      try {
        const token =
          url.searchParams.get("token") ||
          readCookieValue(req.headers.get("cookie"), "token");

        if (!token) {
          return new Response("Unauthorized", { status: 401 });
        }

        const userId = verifyUserId(token);
        const upgraded = server.upgrade(req, {
          data: {
            userId,
          } as any,
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
        addClient(ws.data.userId, ws);
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

      if (!data.type || !data.content?.trim()) {
        ws.send(JSON.stringify({ type: "error", message: "Message required" }));
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
      }
      console.log("WS disconnected");
    },
  },
});

console.log(`🚀 Server running on ${port}`);
