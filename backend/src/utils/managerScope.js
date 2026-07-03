import db from '../db.js';
import {
  getUserDepartments,
  getUserDepartmentIds,
  staffHasDepartment,
} from './userDepartments.js';

export function getUserById(userId) {
  return db.prepare(`
    SELECT id, email, full_name, role, department_id
    FROM users
    WHERE id = ?
  `).get(userId);
}

export function getManagerDepartmentIds(userId) {
  const user = getUserById(userId);
  if (!user || user.role !== 'manager') return [];

  const departmentIds = getUserDepartmentIds(userId);
  if (departmentIds.length) {
    return departmentIds;
  }

  return user.department_id ? [user.department_id] : [];
}

export function managerHasDepartment(userId, departmentId) {
  return getManagerDepartmentIds(userId).includes(departmentId);
}

export function getManagerDepartmentId(userId) {
  const ids = getManagerDepartmentIds(userId);
  return ids[0] || null;
}

export function canCreateTasks(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'manager') return getManagerDepartmentIds(user.id).length > 0;
  return false;
}

export function resolveTaskDepartmentId(user, requestedDepartmentId) {
  if (user.role === 'admin') {
    return { departmentId: requestedDepartmentId || null };
  }

  if (user.role === 'manager') {
    const managerDeptIds = getManagerDepartmentIds(user.id);
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

export function validateAssignees(user, assigneeIds = []) {
  if (!assigneeIds.length) {
    return { ok: true };
  }

  const uniqueIds = [...new Set(assigneeIds)];

  if (user.role === 'admin') {
    for (const uid of uniqueIds) {
      const assignee = getUserById(uid);
      if (!assignee || assignee.role !== 'staff') {
        return { ok: false, error: 'Tasks can only be assigned to staff members' };
      }
    }
    return { ok: true, assigneeIds: uniqueIds };
  }

  if (user.role === 'manager') {
    const managerDeptIds = getManagerDepartmentIds(user.id);
    if (!managerDeptIds.length) {
      return { ok: false, error: 'Manager has no department assigned. Contact an admin.' };
    }

    for (const uid of uniqueIds) {
      const assignee = getUserById(uid);
      if (!assignee || assignee.role !== 'staff') {
        return { ok: false, error: 'Tasks can only be assigned to staff members' };
      }

      const inManagerScope = managerDeptIds.some((deptId) => staffHasDepartment(uid, deptId));
      if (!inManagerScope) {
        return { ok: false, error: 'Managers can only assign tasks to staff in their departments' };
      }
    }

    return { ok: true, assigneeIds: uniqueIds };
  }

  return { ok: false, error: 'You do not have permission to assign tasks' };
}

export function getAssignableStaff(user) {
  if (user.role === 'admin') {
    return db.prepare(`
      SELECT u.id, u.full_name, u.email, u.role, u.department_id
      FROM users u
      WHERE u.role = 'staff'
      ORDER BY u.full_name
    `).all();
  }

  if (user.role === 'manager') {
    const managerDeptIds = getManagerDepartmentIds(user.id);
    if (!managerDeptIds.length) return [];

    const placeholders = managerDeptIds.map(() => '?').join(', ');
    return db.prepare(`
      SELECT DISTINCT u.id, u.full_name, u.email, u.role, u.department_id
      FROM users u
      INNER JOIN user_departments ud ON ud.user_id = u.id
      WHERE u.role = 'staff' AND ud.department_id IN (${placeholders})
      ORDER BY u.full_name
    `).all(...managerDeptIds);
  }

  return [];
}

export function formatAssignableStaff(row) {
  const departments = getUserDepartments(row.id);

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

export function managerCanAccessTask(userId, taskId) {
  const managerDeptIds = getManagerDepartmentIds(userId);
  if (!managerDeptIds.length) return false;

  const task = db.prepare('SELECT id, department_id FROM tasks WHERE id = ?').get(taskId);
  if (!task) return false;

  if (task.department_id && managerDeptIds.includes(task.department_id)) {
    return true;
  }

  const placeholders = managerDeptIds.map(() => '?').join(', ');
  return Boolean(
    db.prepare(`
      SELECT 1
      FROM task_assignees ta
      INNER JOIN user_departments ud ON ud.user_id = ta.user_id
      WHERE ta.task_id = ? AND ud.department_id IN (${placeholders})
    `).get(taskId, ...managerDeptIds)
  );
}
