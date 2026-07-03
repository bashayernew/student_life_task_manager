import db from '../db.js';

export function getUserDepartments(userId) {
  return db.prepare(`
    SELECT d.id, d.name
    FROM user_departments ud
    JOIN departments d ON d.id = ud.department_id
    WHERE ud.user_id = ?
    ORDER BY d.name
  `).all(userId);
}

export function getUserDepartmentIds(userId) {
  return getUserDepartments(userId).map((dept) => dept.id);
}

export function userHasDepartment(userId, departmentId) {
  if (!userId || !departmentId) return false;

  return Boolean(
    db.prepare(`
      SELECT 1 FROM user_departments
      WHERE user_id = ? AND department_id = ?
    `).get(userId, departmentId)
  );
}

export function staffHasDepartment(staffUserId, departmentId) {
  return userHasDepartment(staffUserId, departmentId);
}

export function setUserDepartments(userId, departmentIds = []) {
  const uniqueIds = [...new Set((departmentIds || []).filter(Boolean))];

  for (const departmentId of uniqueIds) {
    const dept = db.prepare('SELECT id FROM departments WHERE id = ?').get(departmentId);
    if (!dept) {
      throw new Error('Department not found');
    }
  }

  const replaceDepartments = db.transaction((targetUserId, ids) => {
    db.prepare('DELETE FROM user_departments WHERE user_id = ?').run(targetUserId);
    const insert = db.prepare(`
      INSERT INTO user_departments (user_id, department_id) VALUES (?, ?)
    `);
    for (const departmentId of ids) {
      insert.run(targetUserId, departmentId);
    }
  });

  replaceDepartments(userId, uniqueIds);
  return getUserDepartments(userId);
}

export function syncLegacyDepartmentId(userId) {
  const departments = getUserDepartments(userId);
  db.prepare(`
    UPDATE users
    SET department_id = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(departments[0]?.id || null, userId);
}

export function formatDepartmentsPayload(userRow) {
  let departments = getUserDepartments(userRow.id);

  if (
    userRow.role === 'manager' &&
    userRow.department_id &&
    !departments.some((dept) => dept.id === userRow.department_id)
  ) {
    const legacyDept = db.prepare('SELECT id, name FROM departments WHERE id = ?').get(userRow.department_id);
    if (legacyDept) {
      departments = [legacyDept, ...departments];
    }
  }

  const primaryDepartment = departments[0] || null;

  return {
    id: userRow.id,
    email: userRow.email,
    full_name: userRow.full_name,
    role: userRow.role,
    department_id: primaryDepartment?.id || userRow.department_id || null,
    department: primaryDepartment,
    departments,
    department_ids: departments.map((dept) => dept.id),
  };
}
