import { Hono } from "hono";
import authApp from "./routes/auth";
import messageApp from "./routes/message";
import friendsApp from "./routes/friends";

const app = new Hono();

app.get("/", (c) => {
  return c.json({ message: "API running" });
});

// Mount routes
app.route("/auth", authApp);
app.route("/messages", messageApp);
app.route("/friends", friendsApp);

const port = Number(process.env.PORT) || 8080;

Bun.serve({
  port,
  hostname: "0.0.0.0",
  fetch: app.fetch,
});

console.log(`🚀 Server running on ${port}`);
