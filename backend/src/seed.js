import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

if (userCount > 0) {
  console.log('Database already seeded, skipping.');
  process.exit(0);
}

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

const insertDept = db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)');
const deptIds = {};
for (const name of departments) {
  const id = uuidv4();
  insertDept.run(id, name);
  deptIds[name] = id;
}

const insertUser = db.prepare(`
  INSERT INTO users (id, email, password_hash, full_name, role, department_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const users = [
  { email: 'superadmin@admin.com', password: 'Adm!n@123', full_name: 'Super Admin', role: 'admin', department_id: null },
  { email: 'manager@taskmanager.com', password: 'password123', full_name: 'Activities Manager', role: 'manager', department_id: deptIds['Student Activities'] },
  { email: 'john@taskmanager.com', password: 'password123', full_name: 'John Smith', role: 'staff', department_id: deptIds['Student Activities'] },
  { email: 'sarah@taskmanager.com', password: 'password123', full_name: 'Sarah Johnson', role: 'staff', department_id: deptIds['Residence Life'] },
];

for (const u of users) {
  insertUser.run(uuidv4(), u.email, bcrypt.hashSync(u.password, 10), u.full_name, u.role, u.department_id);
}

console.log('Database seeded successfully.');
console.log('Admin: superadmin@admin.com / Adm!n@123');
console.log('Manager: manager@taskmanager.com / password123 (Student Activities)');
console.log('Staff: john@taskmanager.com / password123');
