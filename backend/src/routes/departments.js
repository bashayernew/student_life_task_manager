import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { sql } from '../db.js';
import { authMiddleware, requireAdmin } from '../middleware/auth.js';
import { getUserById, getManagerDepartmentIds } from '../utils/managerScope.js';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req, res) => {
  const user = await getUserById(req.user.id);

  if (user?.role === 'manager') {
    const managerDeptIds = await getManagerDepartmentIds(user.id);
    if (!managerDeptIds.length) {
      return res.json([]);
    }

    const rows = await sql`
      SELECT d.id, d.name, d.created_at,
        (
          SELECT COUNT(*)::int FROM (
            SELECT user_id FROM user_departments WHERE department_id = d.id
            UNION
            SELECT id FROM users WHERE department_id = d.id
          ) sub
        ) as staff_count,
        (SELECT COUNT(*)::int FROM tasks t WHERE t.department_id = d.id) as task_count
      FROM departments d
      WHERE d.id = ANY(${managerDeptIds})
      ORDER BY d.name
    `;

    return res.json(rows);
  }

  const rows = await sql`
    SELECT d.id, d.name, d.created_at,
      (
        SELECT COUNT(*)::int FROM (
          SELECT user_id FROM user_departments WHERE department_id = d.id
          UNION
          SELECT id FROM users WHERE department_id = d.id
        ) sub
      ) as staff_count,
      (SELECT COUNT(*)::int FROM tasks t WHERE t.department_id = d.id) as task_count
    FROM departments d
    ORDER BY d.name
  `;
  res.json(rows);
});

router.post('/', requireAdmin, async (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  const existing = await sql`
    SELECT id, name FROM departments WHERE lower(name) = lower(${name})
  `;
  if (existing[0]) {
    return res.status(400).json({ error: 'A department with this name already exists' });
  }

  const id = uuidv4();
  try {
    await sql`INSERT INTO departments (id, name) VALUES (${id}, ${name})`;
    res.status(201).json({ id, name });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create department' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  const name = req.body?.name?.trim();
  if (!name) {
    return res.status(400).json({ error: 'Department name is required' });
  }

  const duplicate = await sql`
    SELECT id FROM departments WHERE lower(name) = lower(${name}) AND id != ${req.params.id}
  `;
  if (duplicate[0]) {
    return res.status(400).json({ error: 'A department with this name already exists' });
  }

  const rows = await sql`
    UPDATE departments SET name = ${name}
    WHERE id = ${req.params.id}
    RETURNING id
  `;

  if (!rows.length) {
    return res.status(404).json({ error: 'Department not found' });
  }

  res.json({ id: req.params.id, name });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const deptRows = await sql`
    SELECT id, name FROM departments WHERE id = ${req.params.id}
  `;
  const dept = deptRows[0];
  if (!dept) {
    return res.status(404).json({ error: 'Department not found' });
  }

  const staffCountRows = await sql`
    SELECT COUNT(*)::int as count FROM (
      SELECT user_id FROM user_departments WHERE department_id = ${req.params.id}
      UNION
      SELECT id FROM users WHERE department_id = ${req.params.id}
    ) sub
  `;
  const taskCountRows = await sql`
    SELECT COUNT(*)::int as count FROM tasks WHERE department_id = ${req.params.id}
  `;

  const staffCount = staffCountRows[0]?.count ?? 0;
  const taskCount = taskCountRows[0]?.count ?? 0;

  if (staffCount > 0 || taskCount > 0) {
    return res.status(400).json({
      error: `Cannot delete "${dept.name}": assigned to ${staffCount} staff and ${taskCount} tasks. Reassign them first.`,
    });
  }

  await sql`DELETE FROM departments WHERE id = ${req.params.id}`;
  res.json({ success: true });
});

export default router;
