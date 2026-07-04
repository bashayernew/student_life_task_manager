import { sql } from '../db.js';

export async function getUserDepartments(userId) {
  return sql`
    SELECT d.id, d.name
    FROM user_departments ud
    JOIN departments d ON d.id = ud.department_id
    WHERE ud.user_id = ${userId}
    ORDER BY d.name
  `;
}

export async function getUserDepartmentIds(userId) {
  const departments = await getUserDepartments(userId);
  return departments.map((dept) => dept.id);
}

export async function userHasDepartment(userId, departmentId) {
  if (!userId || !departmentId) return false;

  const rows = await sql`
    SELECT 1 FROM user_departments
    WHERE user_id = ${userId} AND department_id = ${departmentId}
  `;
  return rows.length > 0;
}

export async function staffHasDepartment(staffUserId, departmentId) {
  return userHasDepartment(staffUserId, departmentId);
}

export async function setUserDepartments(userId, departmentIds = []) {
  const uniqueIds = [...new Set((departmentIds || []).filter(Boolean))];

  for (const departmentId of uniqueIds) {
    const dept = await sql`SELECT id FROM departments WHERE id = ${departmentId}`;
    if (!dept[0]) {
      throw new Error('Department not found');
    }
  }

  await sql`DELETE FROM user_departments WHERE user_id = ${userId}`;

  for (const departmentId of uniqueIds) {
    await sql`
      INSERT INTO user_departments (user_id, department_id)
      VALUES (${userId}, ${departmentId})
      ON CONFLICT DO NOTHING
    `;
  }

  return getUserDepartments(userId);
}

export async function syncLegacyDepartmentId(userId) {
  const departments = await getUserDepartments(userId);
  await sql`
    UPDATE users
    SET department_id = ${departments[0]?.id || null}, updated_at = NOW()
    WHERE id = ${userId}
  `;
}

export async function formatDepartmentsPayload(userRow) {
  let departments = await getUserDepartments(userRow.id);

  if (
    userRow.role === 'manager' &&
    userRow.department_id &&
    !departments.some((dept) => dept.id === userRow.department_id)
  ) {
    const legacy = await sql`
      SELECT id, name FROM departments WHERE id = ${userRow.department_id}
    `;
    if (legacy[0]) {
      departments = [legacy[0], ...departments];
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
