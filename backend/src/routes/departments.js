import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { getUserById, getManagerDepartmentIds } from '../utils/managerScope.js';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const user = getUserById(req.user.id);

  if (user?.role === 'manager') {
    const managerDeptIds = getManagerDepartmentIds(user.id);
    if (!managerDeptIds.length) {
      return res.json([]);
    }

    const placeholders = managerDeptIds.map(() => '?').join(', ');
    const rows = db.prepare(`
      SELECT d.id, d.name, d.created_at,
        (
          SELECT COUNT(*) FROM (
            SELECT user_id FROM user_departments WHERE department_id = d.id
            UNION
            SELECT id FROM users WHERE department_id = d.id
          )
        ) as staff_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.department_id = d.id) as task_count
      FROM departments d
      WHERE d.id IN (${placeholders})
      ORDER BY d.name
    `).all(...managerDeptIds);

    return res.json(rows);
  }

  const rows = db.prepare(`
    SELECT d.id, d.name, d.created_at,
      (
        SELECT COUNT(*) FROM (
          SELECT user_id FROM user_departments WHERE department_id = d.id
          UNION
          SELECT id FROM users WHERE department_id = d.id
        )
      ) as staff_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.department_id = d.id) as task_count
    FROM departments d
    ORDER BY d.name
  `).all();
  res.json(rows);
});

router.post('/', requireAdmin, (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  const existing = db.prepare('SELECT id, name FROM departments WHERE lower(name) = lower(?)').get(name);
  if (existing) {
    return res.status(400).json({ error: 'A department with this name already exists' });
  }

  const id = uuidv4();
  try {
    db.prepare('INSERT INTO departments (id, name) VALUES (?, ?)').run(id, name);
    res.status(201).json({ id, name });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create department' });
  }
});

router.put('/:id', requireAdmin, (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  const duplicate = db.prepare(`
    SELECT id FROM departments WHERE lower(name) = lower(?) AND id != ?
  `).get(name, req.params.id);
  if (duplicate) {
    return res.status(400).json({ error: 'A department with this name already exists' });
  }

  const result = db.prepare(`
    UPDATE departments SET name = ? WHERE id = ?
  `).run(name, req.params.id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Department not found' });
  }

  res.json({ id: req.params.id, name });
});

router.delete('/:id', requireAdmin, (req, res) => {
  const dept = db.prepare('SELECT id, name FROM departments WHERE id = ?').get(req.params.id);
  if (!dept) {
    return res.status(404).json({ error: 'Department not found' });
  }

  const staffCount = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT user_id FROM user_departments WHERE department_id = ?
      UNION
      SELECT id FROM users WHERE department_id = ?
    )
  `).get(req.params.id, req.params.id).count;
  const taskCount = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE department_id = ?').get(req.params.id).count;

  if (staffCount > 0 || taskCount > 0) {
    return res.status(400).json({
      error: `Cannot delete "${dept.name}": assigned to ${staffCount} staff and ${taskCount} tasks. Reassign them first.`,
    });
  }

  db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

export default router;
