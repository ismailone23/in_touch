import { Hono } from "hono";
import authMiddleware, { type JwtPayload } from "../utils/auth-middleware";
import { db, groups, groupMembers, users } from "@repo/db";
import { and, eq } from "drizzle-orm";
import { sendGroupInviteEmail } from "../services/notification-mail";

type Variables = {
  user: JwtPayload;
};

const app = new Hono<{ Variables: Variables }>();

app.use("*", authMiddleware);

// Create group
app.post("/create", async (c) => {
  const user = c.get("user");
  const { name, description } = await c.req.json();

  if (!name) {
    return c.json({ error: "Group name required" }, 400);
  }

  const groupId = crypto.randomUUID();
  const newGroup = await db
    .insert(groups)
    .values({
      id: groupId,
      name,
      description: description || "",
      createdBy: user.userId,
    })
    .returning();

  // Add creator as member
  await db
    .insert(groupMembers)
    .values({
      groupId,
      userId: user.userId,
    })
    .catch((err) => console.error("Failed to add creator to group:", err));

  return c.json(newGroup[0]);
});

// Get all groups for user
app.get("/list", async (c) => {
  const user = c.get("user");

  const userGroups = await db
    .select({
      id: groups.id,
      name: groups.name,
      description: groups.description,
      createdBy: groups.createdBy,
      createdAt: groups.createdAt,
    })
    .from(groups)
    .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
    .where(eq(groupMembers.userId, user.userId));

  return c.json(userGroups);
});

// Add member to group
app.post("/add-member", async (c) => {
  const user = c.get("user");
  const { groupId, memberId, memberEmail } = await c.req.json();

  if (!groupId || !memberId) {
    return c.json({ error: "groupId and memberId required" }, 400);
  }

  // Check if group exists and user is member
  const groupCheck = await db
    .select()
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.userId),
      ),
    );

  if (!groupCheck.length) {
    return c.json({ error: "You are not a member of this group" }, 403);
  }

  // Check if already member
  const existing = await db
    .select()
    .from(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, memberId)),
    );

  if (existing.length) {
    return c.json({ error: "User is already a member" }, 400);
  }

  // Add member
  const newMember = await db
    .insert(groupMembers)
    .values({
      groupId,
      userId: memberId,
    })
    .returning();

  // Get group and user info for email
  const [groupInfo, memberInfo, inviterInfo] = await Promise.all([
    db.select().from(groups).where(eq(groups.id, groupId)),
    db.select().from(users).where(eq(users.id, memberId)),
    db.select().from(users).where(eq(users.id, user.userId)),
  ]);

  if (groupInfo.length && memberInfo.length) {
    // Send email notification (fire and forget)
    sendGroupInviteEmail(
      memberInfo[0]!.email,
      groupInfo[0]!.name,
      inviterInfo[0]?.name || "A user",
      groupId,
    ).catch((err) => console.error("Failed to send group invite email:", err));
  }

  return c.json(newMember[0]);
});

// Remove member from group
app.post("/remove-member", async (c) => {
  const user = c.get("user");
  const { groupId, memberId } = await c.req.json();

  if (!groupId || !memberId) {
    return c.json({ error: "groupId and memberId required" }, 400);
  }

  // Check if user is group creator
  const groupInfo = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId));

  if (!groupInfo.length || groupInfo[0]!.createdBy !== user.userId) {
    return c.json({ error: "Only group creator can remove members" }, 403);
  }

  // Remove member
  await db
    .delete(groupMembers)
    .where(
      and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, memberId)),
    );

  return c.json({ message: "Member removed" });
});

// Leave group
app.post("/leave", async (c) => {
  const user = c.get("user");
  const { groupId } = await c.req.json();

  if (!groupId) {
    return c.json({ error: "groupId required" }, 400);
  }

  await db
    .delete(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.userId),
      ),
    );

  return c.json({ message: "Left group" });
});

// Get group members
app.get("/:groupId/members", async (c) => {
  const user = c.get("user");
  const { groupId } = c.req.param();

  // Check if user is member
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
    return c.json({ error: "You are not a member of this group" }, 403);
  }

  const members = await db
    .select({
      id: groupMembers.id,
      userId: groupMembers.userId,
      name: users.name,
      email: users.email,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, groupId));

  return c.json(members);
});

export default app;
