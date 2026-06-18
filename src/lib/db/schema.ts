import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import type { ReportBlocks } from "@/lib/reports/report-blocks";

export const aiModels = sqliteTable(
  "ai_models",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull(),
    modelId: text("model_id").notNull(),
    displayName: text("display_name").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("ai_models_provider_model_id_unique").on(table.provider, table.modelId),
  ],
);

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  login: text("login").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["user", "admin"] }).notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const sources = sqliteTable(
  "sources",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    type: text("type"),
    country: text("country"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [uniqueIndex("sources_name_unique").on(table.name)],
);

export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  period: text("period").notNull(),
  nextRunAt: integer("next_run_at", { mode: "timestamp_ms" }),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  blocks: text("blocks", { mode: "json" }).$type<ReportBlocks>().notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedBy: text("updated_by").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export const tasks = sqliteTable(
  "tasks",
  {
    taskId: text("task_id").primaryKey(),
    reportId: text("report_id"),
    keyWords: text("key_words"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["pending", "success", "failure"] }).notNull(),
    downloadUrl: text("download_url"),
    error: text("error"),
    read: integer("read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    doneAt: integer("done_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("tasks_user_id_idx").on(table.userId), index("tasks_read_idx").on(table.read)],
);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  ip: text("ip"),
  ipGeoCountry: text("ip_geo_country"),
  ipGeoRegion: text("ip_geo_region"),
  ipGeoCity: text("ip_geo_city"),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

export type AiModel = typeof aiModels.$inferSelect;
export type NewAiModel = typeof aiModels.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Session = typeof sessions.$inferSelect;
