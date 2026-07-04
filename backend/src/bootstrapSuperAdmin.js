import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sql } from './db.js';

const DEFAULT_SUPERADMIN_EMAIL = 'superadmin@admin.com';
const DEFAULT_SUPERADMIN_PASSWORD = 'Adm!n@123';

export async function ensureSuperAdmin() {
  const email = (
    process.env.SUPERADMIN_EMAIL ||
    process.env.SEED_ADMIN_EMAIL ||
    DEFAULT_SUPERADMIN_EMAIL
  ).trim();

  const password =
    process.env.SUPERADMIN_PASSWORD ||
    process.env.SEED_ADMIN_PASSWORD ||
    DEFAULT_SUPERADMIN_PASSWORD;

  const existing = await sql`
    SELECT id, email FROM users WHERE lower(email) = lower(${email})
  `;

  if (existing[0]) {
    console.log(`Super admin ready: ${existing[0].email}`);
    return { email: existing[0].email, created: false };
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const id = uuidv4();

  await sql`
    INSERT INTO users (id, email, password_hash, full_name, role, department_id)
    VALUES (${id}, ${email}, ${passwordHash}, ${'Super Admin'}, ${'admin'}, NULL)
  `;

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
