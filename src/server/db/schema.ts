import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  websiteUrl: text("website_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const forms = sqliteTable(
  "forms",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    endpointSlug: text("endpoint_slug").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    allowedOrigins: text("allowed_origins", { mode: "json" }).$type<string[]>().notNull().default([]),
    redirectUrl: text("redirect_url"),
    successMessage: text("success_message"),
    validationConfig: text("validation_config", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
    honeypotField: text("honeypot_field").default("_gotcha"),
    spamProtection: integer("spam_protection", { mode: "boolean" }).notNull().default(true),
    rateLimitPerMinute: integer("rate_limit_per_minute").notNull().default(30),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    slugUnique: uniqueIndex("forms_endpoint_slug_unique").on(table.endpointSlug),
    projectIdx: index("forms_project_id_idx").on(table.projectId),
  }),
);

export const submissions = sqliteTable(
  "submissions",
  {
    id: text("id").primaryKey(),
    formId: text("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    data: text("data", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
    status: text("status").notNull().default("unread"),
    deviceType: text("device_type"),
    browser: text("browser"),
    country: text("country"),
    region: text("region"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    formIdx: index("submissions_form_id_idx").on(table.formId),
    createdIdx: index("submissions_created_at_idx").on(table.createdAt),
    statusIdx: index("submissions_status_idx").on(table.status),
  }),
);

export const projectIntegrations = sqliteTable(
  "project_integrations",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
    encryptedCredentials: text("encrypted_credentials"),
    settings: text("settings", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    projectProviderUnique: uniqueIndex("project_integrations_project_provider_unique").on(
      table.projectId,
      table.provider,
    ),
  }),
);

export const notificationLogs = sqliteTable(
  "notification_logs",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    submissionId: text("submission_id").references(() => submissions.id, { onDelete: "set null" }),
    provider: text("provider").notNull(),
    status: text("status").notNull(),
    errorMessage: text("error_message"),
    sentAt: integer("sent_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    submissionIdx: index("notification_logs_submission_id_idx").on(table.submissionId),
    projectIdx: index("notification_logs_project_id_idx").on(table.projectId),
  }),
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    sessionTokenHash: text("session_token_hash").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("sessions_token_hash_unique").on(table.sessionTokenHash),
  }),
);

export const projectSettings = sqliteTable("project_settings", {
  projectId: text("project_id")
    .primaryKey()
    .references(() => projects.id, { onDelete: "cascade" }),
  retentionDays: integer("retention_days"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
