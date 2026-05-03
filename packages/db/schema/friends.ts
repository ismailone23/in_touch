import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./user";

export const friendStatusEnum = pgEnum("friend_status", [
  "pending",
  "accepted",
  "blocked",
]);

export const friends = pgTable("friends", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  friendId: uuid("friend_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: friendStatusEnum("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
