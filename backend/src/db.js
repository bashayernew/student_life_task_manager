import { neon } from '@neondatabase/serverless';
import { ensureSuperAdmin } from './bootstrapSuperAdmin.js';

function getConnectionString() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) {
    throw new Error('DATABASE_URL (or POSTGRES_URL) is required');
  }
  if (raw.includes('sslmode=')) return raw;
  const sep = raw.includes('?') ? '&' : '?';
  return `${raw}${sep}sslmode=require`;
}

/** @type {import('@neondatabase/serverless').NeonQueryFunction} */
export const sql = neon(getConnectionString());

/** Dynamic SQL with $1, $2 placeholders (for UPDATE builders). */
export async function query(text, params = []) {
  return sql(text, params);
}

export async function queryOne(text, params = []) {
  const rows = await sql(text, params);
  return rows[0] ?? null;
}

export async function queryAll(text, params = []) {
  return sql(text, params);
}

let initPromise = null;

async function runMigrations() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
      department_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      department_id TEXT REFERENCES departments(id),
      created_by TEXT REFERENCES users(id),
      due_at TIMESTAMPTZ,
      due_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS task_assignees (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      personal_description TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (task_id, user_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS user_departments (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, department_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS task_comments (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES task_comments(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS task_comment_recipients (
      comment_id TEXT NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (comment_id, user_id)
    )
  `;

  await sql`
    DO $$
    BEGIN
      ALTER TABLE task_assignees ADD COLUMN personal_description TEXT DEFAULT '';
    EXCEPTION
      WHEN duplicate_column THEN NULL;
    END $$
  `;

  const legacyStaff = await sql`
    SELECT id, department_id FROM users
    WHERE role = 'staff' AND department_id IS NOT NULL
  `;
  for (const row of legacyStaff) {
    await sql`
      INSERT INTO user_departments (user_id, department_id)
      VALUES (${row.id}, ${row.department_id})
      ON CONFLICT DO NOTHING
    `;
  }

  const legacyManagers = await sql`
    SELECT id, department_id FROM users
    WHERE role = 'manager' AND department_id IS NOT NULL
  `;
  for (const row of legacyManagers) {
    await sql`
      INSERT INTO user_departments (user_id, department_id)
      VALUES (${row.id}, ${row.department_id})
      ON CONFLICT DO NOTHING
    `;
  }
}

/** Idempotent schema + super-admin; once per warm serverless instance. */
export function ensureDbReady() {
  if (!initPromise) {
    initPromise = (async () => {
      await runMigrations();
      await ensureSuperAdmin();
    })();
  }
  return initPromise;
}

export default sql;
