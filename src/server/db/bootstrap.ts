import { getClient } from "./client.ts";

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    website_url TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS forms (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    endpoint_slug TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    allowed_origins TEXT NOT NULL DEFAULT '[]',
    redirect_url TEXT,
    success_message TEXT,
    validation_config TEXT NOT NULL DEFAULT '{}',
    honeypot_field TEXT DEFAULT '_gotcha',
    spam_protection INTEGER NOT NULL DEFAULT 1,
    rate_limit_per_minute INTEGER NOT NULL DEFAULT 30,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS forms_endpoint_slug_unique ON forms(endpoint_slug)`,
  `CREATE INDEX IF NOT EXISTS forms_project_id_idx ON forms(project_id)`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
    data TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unread',
    device_type TEXT,
    browser TEXT,
    country TEXT,
    region TEXT,
    user_agent TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS submissions_form_id_idx ON submissions(form_id)`,
  `CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON submissions(created_at)`,
  `CREATE INDEX IF NOT EXISTS submissions_status_idx ON submissions(status)`,
  `CREATE TABLE IF NOT EXISTS project_integrations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    encrypted_credentials TEXT,
    settings TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS project_integrations_project_provider_unique ON project_integrations(project_id, provider)`,
  `CREATE TABLE IF NOT EXISTS notification_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    submission_id TEXT REFERENCES submissions(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL,
    error_message TEXT,
    sent_at INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS notification_logs_submission_id_idx ON notification_logs(submission_id)`,
  `CREATE INDEX IF NOT EXISTS notification_logs_project_id_idx ON notification_logs(project_id)`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    session_token_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS sessions_token_hash_unique ON sessions(session_token_hash)`,
  `CREATE TABLE IF NOT EXISTS project_settings (
    project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    retention_days INTEGER,
    updated_at INTEGER NOT NULL
  )`,
];

export async function bootstrapSchema(): Promise<void> {
  const client = getClient();
  await client.execute("PRAGMA foreign_keys = ON");
  for (const statement of STATEMENTS) {
    await client.execute(statement);
  }
}
