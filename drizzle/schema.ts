import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Stable application identity used by both legacy Manus users and local accounts. */
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  /** Lowercase unique username used for password-only authentication. */
  username: varchar("username", { length: 32 }).unique(),
  /** Supabase Auth user id for local password accounts. */
  supabaseAuthId: varchar("supabaseAuthId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const developerAuditLog = mysqlTable("developerAuditLog", {
  id: int("id").autoincrement().primaryKey(),
  actorOpenId: varchar("actorOpenId", { length: 128 }).notNull(),
  targetOpenId: varchar("targetOpenId", { length: 128 }).notNull(),
  targetUsername: varchar("targetUsername", { length: 32 }),
  targetSupabaseAuthId: varchar("targetSupabaseAuthId", { length: 64 }),
  action: varchar("action", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your feature queries here as your product grows.