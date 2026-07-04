import { neon } from '@neondatabase/serverless';
import { ensureSuperAdmin } from './bootstrapSuperAdmin.js';

const UNPOOLED_ENV_KEYS = [
  'DATABASE_URL_UNPOOLED',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_URL_UNPOOLED',
];

const INIT_TIMEOUT_MS = 25_000;

function normalizeConnectionString(raw) {
  const trimmed = raw.trim();
  if (trimmed.includes('sslmode=')) return trimmed;
  const sep = trimmed.includes('?') ? '&' : '?';
  return `${trimmed}${sep}sslmode=require`;
}

function hostFromConnectionString(connectionString) {
  try {
    const normalized = connectionString.replace(/^postgres(ql)?:/, 'postgresql:');
    return new URL(normalized).hostname;
  } catch {
    return '';
  }
}

function isPooledConnectionString(connectionString) {
  const host = hostFromConnectionString(connectionString);
  return host.includes('-pooler') || host.includes('pooler.');
}

/**
 * Prefer Neon pooled URL for serverless HTTP queries.
 * Vercel + Neon integration: POSTGRES_URL is usually the pooled `-pooler` host.
 */
export function getDatabaseUrl() {
  const candidates = [
    { name: 'POSTGRES_URL', value: process.env.POSTGRES_URL },
    { name: 'DATABASE_URL', value: process.env.DATABASE_URL },
    { name: 'POSTGRES_PRISMA_URL', value: process.env.POSTGRES_PRISMA_URL },
  ].filter((entry) => typeof entry.value === 'string' && entry.value.trim());

  if (!candidates.length) {
    const unpooledSet = UNPOOLED_ENV_KEYS.filter((key) => process.env[key]);
    if (unpooledSet.length) {
      throw new Error(
        `Do not use ${unpooledSet.join(', ')} in serverless. ` +
          'Set POSTGRES_URL (pooled, host contains -pooler) or DATABASE_URL instead.'
      );
    }
    throw new Error('POSTGRES_URL or DATABASE_URL is required (use Neon pooled connection string).');
  }

  const pooled = candidates.find((entry) => isPooledConnectionString(entry.value));
  if (pooled) {
    return normalizeConnectionString(pooled.value);
  }

  const chosen = candidates[0];
  if (process.env.VERCEL) {
    console.warn(
      `[db] ${chosen.name} does not look pooled (expected -pooler in host). ` +
        'Set POSTGRES_URL from Neon integration for serverless.'
    );
  }

  return normalizeConnectionString(chosen.value);
}

/** HTTP-based Neon query function (no TCP pool / WebSocket session). */
let _sql = null;

function getSql() {
  if (!_sql) {
    _sql = neon(getDatabaseUrl());
  }
  return _sql;
}

/** Tagged-template query helper. */
export function sql(strings, ...values) {
  return getSql()(strings, ...values);
}

/** Dynamic SQL with $1, $2 placeholders. */
export async function query(text, params = []) {
  return getSql()(text, params);
}

export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

export async function queryAll(text, params = []) {
  return query(text, params);
}

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

async function runInit() {
  await runMigrations();
  await ensureSuperAdmin();
}

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${INIT_TIMEOUT_MS}ms`)), INIT_TIMEOUT_MS);
    }),
  ]);
}

let initPromise = null;

export function ensureDbReady() {
  if (!initPromise) {
    initPromise = withTimeout(runInit(), 'Database initialization')
      .then((result) => {
        console.log('[db] ready');
        return result;
      })
      .catch((err) => {
        initPromise = null;
        console.error('[db] initialization failed:', err);
        throw err;
      });
  }
  return initPromise;
}

/** Module-scope init for serverless cold starts (cached promise). */
export const dbReady = ensureDbReady();

export default sql;
