import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
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

function getStaffUser(userId) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

router.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT u.*
    FROM users u
    ORDER BY u.full_name
  `).all();

  res.json(rows.map(formatDepartmentsPayload));
});

router.get('/assignable', (req, res) => {
  const user = getUserById(req.user.id);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  if (user.role === 'manager' && !getManagerDepartmentIds(user.id).length) {
    return res.json([]);
  }

  if (user.role !== 'admin' && user.role !== 'manager') {
    return res.status(403).json({ error: 'You do not have permission to view assignable staff' });
  }

  const rows = getAssignableStaff(user);
  res.json(rows.map(formatAssignableStaff));
});

router.post('/', requireAdmin, (req, res) => {
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
    const existing = db.prepare('SELECT id FROM departments WHERE lower(name) = lower(?)').get(department.trim());
    if (existing) {
      staffDepartmentIds = [existing.id];
    } else {
      const newDeptId = uuidv4();
      db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)').run(newDeptId, department.trim());
      staffDepartmentIds = [newDeptId];
    }
  }

  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role, department_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      email.trim(),
      bcrypt.hashSync(pwd, 10),
      name.trim(),
      role,
      role === 'manager' ? managerDepartmentIds[0] || null : staffDepartmentIds[0] || null
    );

    if (role === 'staff' && staffDepartmentIds.length) {
      setUserDepartments(id, staffDepartmentIds);
      syncLegacyDepartmentId(id);
    }

    if (role === 'manager' && managerDepartmentIds.length) {
      setUserDepartments(id, managerDepartmentIds);
      syncLegacyDepartmentId(id);
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
    if (err.message?.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    if (err.message === 'Department not found') {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.status(500).json({ error: 'Failed to create staff member' });
  }
});

router.patch('/:id/role', requireAdmin, (req, res) => {
  const { role } = req.body || {};
  if (!['admin', 'staff', 'manager'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const result = db.prepare(`
    UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?
  `).run(role, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ success: true });
});

router.patch('/:id/department', requireAdmin, (req, res) => {
  const { department_id, department_ids } = req.body || {};
  const user = getStaffUser(req.params.id);

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

      setUserDepartments(user.id, ids);
      syncLegacyDepartmentId(user.id);
    }

    const updated = getStaffUser(user.id);
    res.json(formatDepartmentsPayload(updated));
  } catch (err) {
    if (err.message === 'Department not found') {
      return res.status(404).json({ error: 'Department not found' });
    }
    res.status(500).json({ error: 'Failed to update departments' });
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ success: true });
});

export default router;
