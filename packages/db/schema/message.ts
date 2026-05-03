import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: uuid("sender_id").notNull(),
  receiverId: uuid("receiver_id"),
  groupId: uuid("group_id"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
