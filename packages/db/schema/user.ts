import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),

  isVerified: boolean("is_verified").default(false),

  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),

  createdAt: timestamp("created_at").defaultNow(),
});
