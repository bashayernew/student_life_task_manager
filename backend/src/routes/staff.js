import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import {
  getUserById,
  getAssignableStaff,
  formatAssignableStaff,
  getManagerDepartmentIds,
} from '../utils/managerScope.js';
import {
  formatDepartmentsPayload,
  setUserDepartments,
  syncLegacyDepartmentId,
} from '../utils/userDepartments.js';

const router = Router();

router.use(authMiddleware);

async function getStaffUser(userId) {
  const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
  return rows[0] ?? null;
}

router.get('/', async (_req, res) => {
  const rows = await sql`
    SELECT u.*
    FROM users u
    ORDER BY u.full_name
  `;

  const payload = await Promise.all(rows.map((row) => formatDepartmentsPayload(row)));
  res.json(payload);
});

router.get('/assignable', async (req, res) => {
  const user = await getUserById(req.user.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  if (user.role === 'manager' && !(await getManagerDepartmentIds(user.id)).length) {
    return res.json([]);
  }

  if (user.role !== 'admin' && user.role !== 'manager') {
    return res.status(403).json({ error: 'You do not have permission to view assignable staff' });
  }

  const rows = await getAssignableStaff(user);
  const payload = await Promise.all(rows.map((row) => formatAssignableStaff(row)));
  res.json(payload);
});

router.post('/', requireAdmin, async (req, res) => {
  const {
    email,
    password,
    full_name,
    fullName,
    role = 'staff',
    department_id,
    department_ids,
    department,
  } = req.body || {};
  const name = full_name || fullName;
  const pwd = password;

  if (!email || !pwd || !name) {
    return res.status(400).json({ error: 'Email, password, and full name are required' });
  }
  if (!['admin', 'staff', 'manager'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be admin, manager, or staff' });
  }

  let managerDepartmentIds = [];
  let staffDepartmentIds = Array.isArray(department_ids) ? department_ids.filter(Boolean) : [];

  if (role === 'manager') {
    managerDepartmentIds = staffDepartmentIds.length
      ? staffDepartmentIds
      : department_id
        ? [department_id]
        : [];
    staffDepartmentIds = [];
  }

  if (role === 'staff' && !staffDepartmentIds.length && department_id) {
    staffDepartmentIds = [department_id];
  }

  if (department && role === 'staff' && !staffDepartmentIds.length) {
    const existing = await sql`
      SELECT id FROM departments WHERE lower(name) = lower(${department.trim()})
    `;
    if (existing[0]) {
      staffDepartmentIds = [existing[0].id];
    } else {
      const newDeptId = uuidv4();
      await sql`INSERT INTO departments (id, name) VALUES (${newDeptId}, ${department.trim()})`;
      staffDepartmentIds = [newDeptId];
    }
  }

  const id = uuidv4();
  try {
    await sql`
      INSERT INTO users (id, email, password_hash, full_name, role, department_id)
      VALUES (
        ${id},
        ${email.trim()},
        ${bcrypt.hashSync(pwd, 10)},
        ${name.trim()},
        ${role},
        ${role === 'manager' ? managerDepartmentIds[0] || null : staffDepartmentIds[0] || null}
      )
    `;

    if (role === 'staff' && staffDepartmentIds.length) {
      await setUserDepartments(id, staffDepartmentIds);
      await syncLegacyDepartmentId(id);
    }

    if (role === 'manager' && managerDepartmentIds.length) {
      await setUserDepartments(id, managerDepartmentIds);
      await syncLegacyDepartmentId(id);
    }

    res.status(201).json({
      success: true,
      user_id: id,
      email: email.trim(),
      name: name.trim(),
      role,
      message: `Staff member created successfully. They can now login with: ${email.trim()}`,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (err.message === 'Department not found') {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

router.patch('/:id/role', requireAdmin, async (req, res) => {
  const { role } = req.body || {};
  if (!['admin', 'staff', 'manager'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const rows = await sql`
    UPDATE users SET role = ${role}, updated_at = NOW()
    WHERE id = ${req.params.id}
    RETURNING id
  `;

  if (!rows.length) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ success: true });
});

router.patch('/:id/department', requireAdmin, async (req, res) => {
  const { department_id, department_ids } = req.body || {};
  const user = await getStaffUser(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.role === 'admin') {
    return res.status(400).json({ error: 'Admins do not use department assignments' });
  }

  try {
    if (user.role === 'staff' || user.role === 'manager') {
      const ids = Array.isArray(department_ids)
        ? department_ids.filter(Boolean)
        : department_id
          ? [department_id]
          : [];

      await setUserDepartments(user.id, ids);
      await syncLegacyDepartmentId(user.id);
    }

    const updated = await getStaffUser(user.id);
    res.json(await formatDepartmentsPayload(updated));
  } catch (err) {
    if (err.message === 'Department not found') {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.status(500).json({ error: 'Failed to update departments' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const rows = await sql`
    DELETE FROM users WHERE id = ${req.params.id} RETURNING id
  `;
  if (!rows.length) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ success: true });
});

export default router;
