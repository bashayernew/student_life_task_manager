import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/app.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'manager', 'staff')),
    department_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    department_id TEXT REFERENCES departments(id),
    created_by TEXT REFERENCES users(id),
    due_at TEXT,
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_assignees (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (task_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS user_departments (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, department_id)
  );

  CREATE TABLE IF NOT EXISTS task_comments (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES task_comments(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS task_comment_recipients (
    comment_id TEXT NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (comment_id, user_id)
  );
`);

const assigneeColumns = db.prepare('PRAGMA table_info(task_assignees)').all();
if (!assigneeColumns.some((column) => column.name === 'personal_description')) {
  db.exec(`ALTER TABLE task_assignees ADD COLUMN personal_description TEXT DEFAULT ''`);
}

const insertUserDept = db.prepare(`
  INSERT OR IGNORE INTO user_departments (user_id, department_id) VALUES (?, ?)
`);
const legacyStaff = db.prepare(`
  SELECT id, department_id FROM users WHERE role = 'staff' AND department_id IS NOT NULL
`).all();
for (const row of legacyStaff) {
  insertUserDept.run(row.id, row.department_id);
}

const legacyManagers = db.prepare(`
  SELECT id, department_id FROM users WHERE role = 'manager' AND department_id IS NOT NULL
`).all();
for (const row of legacyManagers) {
  insertUserDept.run(row.id, row.department_id);
}

const SUPER_ADMIN_EMAIL = 'superadmin@admin.com';
const SUPER_ADMIN_PASSWORD = 'Adm!n@123';
const superAdminHash = bcrypt.hashSync(SUPER_ADMIN_PASSWORD, 10);

const existingSuperAdmin = db.prepare(`
  SELECT id FROM users WHERE lower(email) = lower(?)
`).get(SUPER_ADMIN_EMAIL);

if (!existingSuperAdmin) {
  const legacyAdmin = db.prepare(`
    SELECT id FROM users WHERE lower(email) = lower(?)
  `).get('eyad123@eyad.com');

  if (legacyAdmin) {
    db.prepare(`
      UPDATE users
      SET email = ?, password_hash = ?, role = 'admin', full_name = 'Super Admin', updated_at = datetime('now')
      WHERE id = ?
    `).run(SUPER_ADMIN_EMAIL, superAdminHash, legacyAdmin.id);
  } else {
    const firstAdmin = db.prepare(`
      SELECT id, email FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
    `).get();

    if (firstAdmin && firstAdmin.email?.toLowerCase() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      db.prepare(`
        UPDATE users
        SET email = ?, password_hash = ?, full_name = 'Super Admin', updated_at = datetime('now')
        WHERE id = ?
      `).run(SUPER_ADMIN_EMAIL, superAdminHash, firstAdmin.id);
    }
  }
}

export default db;
