import { sql } from '../db.js';
import {
  getUserDepartments,
  getUserDepartmentIds,
  staffHasDepartment,
} from './userDepartments.js';

export async function getUserById(userId) {
  const rows = await sql`
    SELECT id, email, full_name, role, department_id
    FROM users
    WHERE id = ${userId}
  `;
  return rows[0] ?? null;
}

export async function getManagerDepartmentIds(userId) {
  const user = await getUserById(userId);
  if (!user || user.role !== 'manager') return [];

  const departmentIds = await getUserDepartmentIds(userId);
  if (departmentIds.length) {
    return departmentIds;
  }

  return user.department_id ? [user.department_id] : [];
}

export async function managerHasDepartment(userId, departmentId) {
  const ids = await getManagerDepartmentIds(userId);
  return ids.includes(departmentId);
}

export async function getManagerDepartmentId(userId) {
  const ids = await getManagerDepartmentIds(userId);
  return ids[0] || null;
}

export async function canCreateTasks(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'manager') {
    const ids = await getManagerDepartmentIds(user.id);
    return ids.length > 0;
  }
  return false;
}

export async function resolveTaskDepartmentId(user, requestedDepartmentId) {
  if (user.role === 'admin') {
    return { departmentId: requestedDepartmentId || null };
  }

  if (user.role === 'manager') {
    const managerDeptIds = await getManagerDepartmentIds(user.id);
    if (!managerDeptIds.length) {
      return { error: 'Manager has no department assigned. Contact an admin.' };
    }

    if (requestedDepartmentId) {
      if (!managerDeptIds.includes(requestedDepartmentId)) {
        return { error: 'Managers can only create tasks for their assigned departments' };
      }
      return { departmentId: requestedDepartmentId };
    }

    if (managerDeptIds.length === 1) {
      return { departmentId: managerDeptIds[0] };
    }

    return { error: 'Please select a department for this task' };
  }

  return { error: 'You do not have permission to create tasks' };
}

export async function validateAssignees(user, assigneeIds = []) {
  if (!assigneeIds.length) {
    return { ok: true };
  }

  const uniqueIds = [...new Set(assigneeIds)];

  if (user.role === 'admin') {
    for (const uid of uniqueIds) {
      const assignee = await getUserById(uid);
      if (!assignee || assignee.role !== 'staff') {
        return { ok: false, error: 'Tasks can only be assigned to staff members' };
      }
    }
    return { ok: true, assigneeIds: uniqueIds };
  }

  if (user.role === 'manager') {
    const managerDeptIds = await getManagerDepartmentIds(user.id);
    if (!managerDeptIds.length) {
      return { ok: false, error: 'Manager has no department assigned. Contact an admin.' };
    }

    for (const uid of uniqueIds) {
      const assignee = await getUserById(uid);
      if (!assignee || assignee.role !== 'staff') {
        return { ok: false, error: 'Tasks can only be assigned to staff members' };
      }

      let inManagerScope = false;
      for (const deptId of managerDeptIds) {
        if (await staffHasDepartment(uid, deptId)) {
          inManagerScope = true;
          break;
        }
      }
      if (!inManagerScope) {
        return { ok: false, error: 'Managers can only assign tasks to staff in their departments' };
      }
    }

    return { ok: true, assigneeIds: uniqueIds };
  }

  return { ok: false, error: 'You do not have permission to assign tasks' };
}

export async function getAssignableStaff(user) {
  if (user.role === 'admin') {
    return sql`
      SELECT u.id, u.full_name, u.email, u.role, u.department_id
      FROM users u
      WHERE u.role = 'staff'
      ORDER BY u.full_name
    `;
  }

  if (user.role === 'manager') {
    const managerDeptIds = await getManagerDepartmentIds(user.id);
    if (!managerDeptIds.length) return [];

    return sql`
      SELECT DISTINCT u.id, u.full_name, u.email, u.role, u.department_id
      FROM users u
      INNER JOIN user_departments ud ON ud.user_id = u.id
      WHERE u.role = 'staff' AND ud.department_id = ANY(${managerDeptIds})
      ORDER BY u.full_name
    `;
  }

  return [];
}

export async function formatAssignableStaff(row) {
  const departments = await getUserDepartments(row.id);

  return {
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
    departments,
    department_ids: departments.map((dept) => dept.id),
    department_id: departments[0]?.id || null,
    department: departments[0] || null,
  };
}

export async function managerCanAccessTask(userId, taskId) {
  const managerDeptIds = await getManagerDepartmentIds(userId);
  if (!managerDeptIds.length) return false;

  const taskRows = await sql`
    SELECT id, department_id FROM tasks WHERE id = ${taskId}
  `;
  const task = taskRows[0];
  if (!task) return false;

  if (task.department_id && managerDeptIds.includes(task.department_id)) {
    return true;
  }

  const rows = await sql`
    SELECT 1
    FROM task_assignees ta
    INNER JOIN user_departments ud ON ud.user_id = ta.user_id
    WHERE ta.task_id = ${taskId} AND ud.department_id = ANY(${managerDeptIds})
    LIMIT 1
  `;
  return rows.length > 0;
}
