import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sql, ensureDbReady } from './db.js';

await ensureDbReady();

const countRows = await sql`SELECT COUNT(*)::int AS count FROM users`;
if (countRows[0].count > 0) {
  console.log('Database already seeded, skipping.');
  process.exit(0);
}

const adminPassword = process.env.SEED_ADMIN_PASSWORD;
const managerPassword = process.env.SEED_MANAGER_PASSWORD || process.env.SEED_STAFF_PASSWORD;
const staffPassword = process.env.SEED_STAFF_PASSWORD;

if (!adminPassword || !managerPassword || !staffPassword) {
  console.error(
    'Missing seed passwords. Set SEED_ADMIN_PASSWORD, SEED_MANAGER_PASSWORD, and SEED_STAFF_PASSWORD in .env before running seed.'
  );
  process.exit(1);
}

const adminEmail = process.env.SEED_ADMIN_EMAIL || 'superadmin@admin.com';

const departments = [
  'Residence Life',
  'Student Activities',
  'Academic Support',
  'Career Services',
  'Counseling Services',
  'Campus Safety',
  'Student Government',
  'Athletics',
  'Dining Services',
  'IT Support',
  'Marketing',
  'Student Engagement',
];

const deptIds = {};
for (const name of departments) {
  const id = uuidv4();
  await sql`INSERT INTO departments (id, name) VALUES (${id}, ${name})`;
  deptIds[name] = id;
}

const users = [
  { email: adminEmail, password: adminPassword, full_name: 'Super Admin', role: 'admin', department_id: null },
  { email: 'manager@taskmanager.com', password: managerPassword, full_name: 'Activities Manager', role: 'manager', department_id: deptIds['Student Activities'] },
  { email: 'john@taskmanager.com', password: staffPassword, full_name: 'John Smith', role: 'staff', department_id: deptIds['Student Activities'] },
  { email: 'sarah@taskmanager.com', password: staffPassword, full_name: 'Sarah Johnson', role: 'staff', department_id: deptIds['Residence Life'] },
];

for (const u of users) {
  const id = uuidv4();
  const hash = bcrypt.hashSync(u.password, 10);
  await sql`
    INSERT INTO users (id, email, password_hash, full_name, role, department_id)
    VALUES (${id}, ${u.email}, ${hash}, ${u.full_name}, ${u.role}, ${u.department_id})
  `;
  if (u.role === 'staff' || u.role === 'manager') {
    if (u.department_id) {
      await sql`
        INSERT INTO user_departments (user_id, department_id)
        VALUES (${id}, ${u.department_id})
        ON CONFLICT DO NOTHING
      `;
    }
  }
}

console.log('Database seeded successfully.');
console.log(`Admin email: ${adminEmail}`);
console.log('Manager email: manager@taskmanager.com');
console.log('Staff email: john@taskmanager.com');
