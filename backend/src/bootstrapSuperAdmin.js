import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';

const DEFAULT_SUPERADMIN_EMAIL = 'superadmin@admin.com';
const DEFAULT_SUPERADMIN_PASSWORD = 'Adm!n@123';

export function ensureSuperAdmin() {
  const email = (
    process.env.SUPERADMIN_EMAIL ||
    process.env.SEED_ADMIN_EMAIL ||
    DEFAULT_SUPERADMIN_EMAIL
  ).trim();

  const password =
    process.env.SUPERADMIN_PASSWORD ||
    process.env.SEED_ADMIN_PASSWORD ||
    DEFAULT_SUPERADMIN_PASSWORD;

  const existing = db.prepare(`
    SELECT id, email FROM users WHERE lower(email) = lower(?)
  `).get(email);

  if (existing) {
    console.log(`Super admin ready: ${existing.email}`);
    return { email: existing.email, created: false };
  }

  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role, department_id)
    VALUES (?, ?, ?, ?, 'admin', NULL)
  `).run(uuidv4(), email, passwordHash, 'Super Admin');

  console.log(`Super admin ready: ${email}`);
  return { email, created: true };
}

export function getSuperAdminDefaults() {
  return {
    email:
      process.env.SUPERADMIN_EMAIL ||
      process.env.SEED_ADMIN_EMAIL ||
      DEFAULT_SUPERADMIN_EMAIL,
    password:
      process.env.SUPERADMIN_PASSWORD ||
      process.env.SEED_ADMIN_PASSWORD ||
      DEFAULT_SUPERADMIN_PASSWORD,
  };
}
