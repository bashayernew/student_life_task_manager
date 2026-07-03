import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import {
  getUserById,
  canCreateTasks,
  resolveTaskDepartmentId,
  validateAssignees,
  getManagerDepartmentIds,
  managerCanAccessTask,
} from '../utils/managerScope.js';

const router = Router();

router.use(authMiddleware);

function normalizeStatus(s) {
  if (!s) return 'pending';
  const k = String(s).toLowerCase().replace(/\s+/g, '_');
  if (k === 'in_progress') return 'in_progress';
  if (k === 'completed') return 'completed';
  return 'pending';
}

function formatUser(row, prefix = '') {
  if (!row) return null;
  const p = prefix ? `${prefix}_` : '';
  const id = row[`${p}id`] ?? row.id;
  if (!id) return null;
  return {
    id,
    full_name: row[`${p}full_name`] ?? row.full_name,
    email: row[`${p}email`] ?? row.email,
    role: row[`${p}role`] ?? row.role,
  };
}

function buildTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    department_id: row.department_id,
    due_at: row.due_at,
    due_date: row.due_date || row.due_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    created_by: formatUser(row, 'creator') || (row.created_by ? { id: row.created_by } : null),
    department: row.dept_id ? { id: row.dept_id, name: row.dept_name } : null,
  };
}

function getTaskAssignees(taskId) {
  return db.prepare(`
    SELECT ta.*, u.id as user_id, u.full_name, u.email, u.role
    FROM task_assignees ta
    JOIN users u ON ta.user_id = u.id
    WHERE ta.task_id = ?
  `).all(taskId).map((a) => ({
    user_id: a.user_id,
    status: a.status,
    updated_at: a.updated_at,
    personal_description: a.personal_description || '',
    user: { id: a.user_id, full_name: a.full_name, email: a.email, role: a.role },
  }));
}

function computeAssigneeSummary(taskId) {
  const assignees = getTaskAssignees(taskId);
  const total = assignees.length;
  const completed = assignees.filter((a) => a.status === 'completed').length;
  const pending = total - completed;

  let overall_status = 'pending';
  if (total === 0) {
    overall_status = 'pending';
  } else if (completed === total) {
    overall_status = 'completed';
  } else if (completed > 0) {
    overall_status = 'partial';
  }

  return { total, completed, pending, overall_status };
}

function syncTaskOverallStatus(taskId) {
  const summary = computeAssigneeSummary(taskId);
  const taskStatus = summary.overall_status === 'completed' ? 'completed' : 'pending';

  db.prepare(`
    UPDATE tasks SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(taskStatus, taskId);

  return summary;
}

function getCommentRecipients(commentId) {
  return db.prepare(`
    SELECT u.id, u.full_name, u.email, u.role
    FROM task_comment_recipients r
    JOIN users u ON u.id = r.user_id
    WHERE r.comment_id = ?
    ORDER BY u.full_name ASC
  `).all(commentId).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: row.email,
    role: row.role,
  }));
}

function setCommentRecipients(commentId, userIds = []) {
  db.prepare('DELETE FROM task_comment_recipients WHERE comment_id = ?').run(commentId);

  const insertRecipient = db.prepare(`
    INSERT INTO task_comment_recipients (comment_id, user_id) VALUES (?, ?)
  `);

  for (const userId of userIds) {
    if (userId) {
      insertRecipient.run(commentId, userId);
    }
  }
}

function getTaskAssigneeUserIds(taskId) {
  return db.prepare(`
    SELECT user_id FROM task_assignees WHERE task_id = ?
  `).all(taskId).map((row) => row.user_id);
}

function formatCommentRow(row, recipients = null) {
  const resolvedRecipients = recipients ?? getCommentRecipients(row.id);

  return {
    id: row.id,
    task_id: row.task_id,
    user_id: row.user_id,
    parent_id: row.parent_id,
    body: row.body,
    created_at: row.created_at,
    audience: resolvedRecipients.length === 0 ? 'everyone' : 'specific',
    recipients: resolvedRecipients,
    user: {
      id: row.user_id,
      full_name: row.full_name,
      email: row.email,
      role: row.role,
    },
  };
}

function canViewComment(user, comment, commentsById) {
  if (!user || !comment) return false;
  if (user.role === 'admin' || user.role === 'manager') return true;
  if (comment.user_id === user.id) return true;

  if (comment.parent_id) {
    const parent = commentsById.get(comment.parent_id);
    if (parent && canViewComment(user, parent, commentsById)) {
      return true;
    }
  }

  const recipients = comment.recipients || [];
  if (recipients.length === 0) return true;

  return recipients.some((recipient) => recipient.id === user.id);
}

function getTaskComments(taskId, viewer = null) {
  const rows = db.prepare(`
    SELECT c.id, c.task_id, c.user_id, c.parent_id, c.body, c.created_at,
      u.full_name, u.email, u.role
    FROM task_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.task_id = ?
    ORDER BY c.created_at ASC
  `).all(taskId);

  const comments = rows.map((row) => formatCommentRow(row));
  const commentsById = new Map(comments.map((comment) => [comment.id, comment]));

  if (!viewer || viewer.role === 'admin' || viewer.role === 'manager') {
    return comments;
  }

  return comments.filter((comment) => canViewComment(viewer, comment, commentsById));
}

function addTaskComment(taskId, userId, body, parentId = null, recipientIds = null) {
  const commentId = uuidv4();
  db.prepare(`
    INSERT INTO task_comments (id, task_id, user_id, parent_id, body)
    VALUES (?, ?, ?, ?, ?)
  `).run(commentId, taskId, userId, parentId, body.trim());

  if (Array.isArray(recipientIds) && recipientIds.length > 0) {
    setCommentRecipients(commentId, recipientIds);
  }

  const row = db.prepare(`
    SELECT c.id, c.task_id, c.user_id, c.parent_id, c.body, c.created_at,
      u.full_name, u.email, u.role
    FROM task_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(commentId);

  return formatCommentRow(row);
}

function canAccessTask(user, taskId) {
  const task = db.prepare('SELECT id, department_id, created_by FROM tasks WHERE id = ?').get(taskId);
  if (!task || !user) return false;

  if (user.role === 'admin') return true;

  if (user.role === 'manager') {
    return managerCanAccessTask(user.id, taskId);
  }

  return Boolean(
    db.prepare('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?').get(taskId, user.id)
  );
}

function canReplyToComments(user, task) {
  return user.role === 'admin' || user.role === 'manager' || task.created_by === user.id;
}

function isTaskAssignee(userId, taskId) {
  return Boolean(
    db.prepare('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?').get(taskId, userId)
  );
}

function canReplyToComment(user, task, parentComment) {
  if (!parentComment) return false;
  if (canReplyToComments(user, task)) return true;

  if (!isTaskAssignee(user.id, task.id)) return false;

  const authorRole = parentComment.author_role || parentComment.role;
  return authorRole === 'admin' || authorRole === 'manager';
}

function buildAssigneeNotesMap(assigneeDetails = [], assigneeNotes = {}) {
  const notesMap = { ...assigneeNotes };

  for (const detail of assigneeDetails) {
    if (detail?.userId) {
      notesMap[detail.userId] = detail.personalDescription || detail.personal_description || '';
    }
  }

  return notesMap;
}

function enrichTask(taskId, row, viewer = null) {
  const assignee_summary = computeAssigneeSummary(taskId);

  return {
    ...buildTask(row),
    status: assignee_summary.overall_status === 'completed' ? 'completed' : 'pending',
    task_assignees: getTaskAssignees(taskId),
    assignee_summary,
    comments: getTaskComments(taskId, viewer),
  };
}

function getFullTask(taskId, viewer = null) {
  const row = db.prepare(`
    SELECT t.*,
      cb.id as creator_id, cb.full_name as creator_full_name, cb.email as creator_email, cb.role as creator_role,
      d.id as dept_id, d.name as dept_name
    FROM tasks t
    LEFT JOIN users cb ON t.created_by = cb.id
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE t.id = ?
  `).get(taskId);

  if (!row) return null;

  return enrichTask(taskId, row, viewer);
}

function formatMyTaskRow(row) {
  return {
    task_id: row.task_id,
    user_id: row.user_id,
    status: row.status,
    updated_at: row.updated_at,
    task_title: row.title,
    task_description: row.description,
    task_due_at: row.due_at,
    task_due_date: row.due_date || row.due_at,
    task_priority: row.priority,
    title: row.title,
    description: row.description,
    due_at: row.due_at,
    due_date: row.due_date || row.due_at,
    priority: row.priority,
    department_id: row.department_id,
    department_name: row.dept_name,
    assignee_status: row.status,
  };
}

router.get('/stats', (req, res) => {
  const userId = req.query.userId || req.user.id;
  const rows = db.prepare(`
    SELECT t.due_at, t.due_date, ta.status
    FROM task_assignees ta
    JOIN tasks t ON ta.task_id = t.id
    WHERE ta.user_id = ?
  `).all(userId);

  const stats = { total: rows.length, pending: 0, in_progress: 0, completed: 0, overdue: 0 };
  const now = new Date();

  for (const row of rows) {
    if (row.status === 'pending') stats.pending++;
    if (row.status === 'in_progress') stats.in_progress++;
    if (row.status === 'completed') stats.completed++;

    const due = row.due_at || row.due_date;
    if (due && new Date(due) < now && row.status !== 'completed') {
      stats.overdue++;
    }
  }

  res.json(stats);
});

router.get('/my', (req, res) => {
  const userId = req.query.userId || req.user.id;
  const rows = db.prepare(`
    SELECT ta.task_id, ta.user_id, ta.status, ta.updated_at,
      t.title, t.description, t.due_at, t.due_date, t.priority, t.department_id,
      d.name as dept_name
    FROM task_assignees ta
    JOIN tasks t ON ta.task_id = t.id
    LEFT JOIN departments d ON t.department_id = d.id
    WHERE ta.user_id = ?
    ORDER BY ta.updated_at DESC
  `).all(userId);

  res.json(rows.map(formatMyTaskRow));
});

router.get('/', (req, res) => {
  const user = getUserById(req.user.id);
  let rows;

  if (user?.role === 'manager') {
    const managerDeptIds = getManagerDepartmentIds(user.id);
    if (!managerDeptIds.length) {
      rows = [];
    } else {
      const placeholders = managerDeptIds.map(() => '?').join(', ');
      rows = db.prepare(`
        SELECT DISTINCT t.*,
          cb.id as creator_id, cb.full_name as creator_full_name, cb.email as creator_email, cb.role as creator_role,
          d.id as dept_id, d.name as dept_name
        FROM tasks t
        LEFT JOIN users cb ON t.created_by = cb.id
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN task_assignees ta ON ta.task_id = t.id
        LEFT JOIN users assignee ON ta.user_id = assignee.id
        LEFT JOIN user_departments ud ON ud.user_id = assignee.id
        WHERE t.department_id IN (${placeholders})
          OR ud.department_id IN (${placeholders})
          OR assignee.department_id IN (${placeholders})
        ORDER BY t.created_at DESC
      `).all(...managerDeptIds, ...managerDeptIds, ...managerDeptIds);
    }
  } else {
    rows = db.prepare(`
      SELECT t.*,
        cb.id as creator_id, cb.full_name as creator_full_name, cb.email as creator_email, cb.role as creator_role,
        d.id as dept_id, d.name as dept_name
      FROM tasks t
      LEFT JOIN users cb ON t.created_by = cb.id
      LEFT JOIN departments d ON t.department_id = d.id
      ORDER BY t.created_at DESC
    `).all();
  }

  res.json(rows.map((row) => enrichTask(row.id, row, user)));
});

router.get('/:id', (req, res) => {
  const user = getUserById(req.user.id);
  const task = getFullTask(req.params.id, user);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (!canAccessTask(user, req.params.id)) {
    return res.status(403).json({ error: 'You do not have access to this task' });
  }

  res.json(task);
});

router.get('/:id/comments', (req, res) => {
  const user = getUserById(req.user.id);
  const taskId = req.params.id;

  if (!db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId)) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (!canAccessTask(user, taskId)) {
    return res.status(403).json({ error: 'You do not have access to this task' });
  }

  res.json(getTaskComments(taskId, user));
});

router.post('/:id/comments', (req, res) => {
  const user = getUserById(req.user.id);
  const taskId = req.params.id;
  const {
    body,
    parent_id: parentId,
    parentId: parentIdAlt,
    recipientIds,
    recipient_ids: recipientIdsAlt,
  } = req.body || {};
  const replyToId = parentId || parentIdAlt || null;
  const requestedRecipients = recipientIds || recipientIdsAlt || null;

  if (!body?.trim()) {
    return res.status(400).json({ error: 'Comment text is required' });
  }

  const task = db.prepare('SELECT id, department_id, created_by FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (!canAccessTask(user, taskId)) {
    return res.status(403).json({ error: 'You do not have access to this task' });
  }

  if (replyToId) {
    const parentComment = db.prepare(`
      SELECT c.id, c.user_id, u.role as author_role
      FROM task_comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = ? AND c.task_id = ?
    `).get(replyToId, taskId);

    if (!parentComment) {
      return res.status(404).json({ error: 'Parent comment not found' });
    }

    if (!canReplyToComment(user, task, parentComment)) {
      return res.status(403).json({ error: 'You cannot reply to this comment' });
    }
  }

  let recipientList = null;
  if (!replyToId && requestedRecipients !== null && requestedRecipients !== undefined) {
    if (user.role !== 'admin' && user.role !== 'manager') {
      return res.status(403).json({ error: 'Only admins and managers can target comments to specific people' });
    }

    if (!Array.isArray(requestedRecipients)) {
      return res.status(400).json({ error: 'recipientIds must be an array' });
    }

    const assigneeIds = getTaskAssigneeUserIds(taskId);
    recipientList = [...new Set(requestedRecipients.filter(Boolean))];

    if (recipientList.length > 0) {
      const invalidRecipient = recipientList.find((recipientId) => !assigneeIds.includes(recipientId));
      if (invalidRecipient) {
        return res.status(400).json({ error: 'Comments can only be assigned to people on this task' });
      }
    }
  }

  const row = addTaskComment(taskId, user.id, body, replyToId, recipientList);

  res.status(201).json(row);
});

router.post('/', (req, res) => {
  const {
    title,
    description,
    details,
    due_at,
    priority,
    department_id,
    created_by,
    userId,
    assigneeIds = [],
    assigneeDetails = [],
    assigneeNotes = {},
  } = req.body || {};

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const user = getUserById(req.user.id);
  if (!canCreateTasks(user)) {
    return res.status(403).json({
      error: user?.role === 'manager' && !getManagerDepartmentIds(user.id).length
        ? 'Manager has no department assigned. Contact an admin.'
        : 'You do not have permission to create tasks',
    });
  }

  const departmentResult = resolveTaskDepartmentId(user, department_id || null);
  if (departmentResult.error) {
    return res.status(403).json({ error: departmentResult.error });
  }

  const assigneeCheck = validateAssignees(user, assigneeIds);
  if (!assigneeCheck.ok) {
    return res.status(403).json({ error: assigneeCheck.error });
  }

  let safePriority = String(priority || 'medium').toLowerCase();
  if (safePriority === 'normal') safePriority = 'medium';

  let dueAtISO = null;
  if (due_at) {
    dueAtISO = due_at instanceof Date ? due_at.toISOString() : new Date(due_at).toISOString();
  }

  const taskId = uuidv4();
  const creatorId = created_by || userId || req.user.id;
  const finalDepartmentId = departmentResult.departmentId ?? departmentResult ?? null;

  db.prepare(`
    INSERT INTO tasks (id, title, description, priority, department_id, created_by, due_at, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    taskId,
    title.trim(),
    description || details || '',
    safePriority,
    finalDepartmentId,
    creatorId,
    dueAtISO,
    dueAtISO
  );

  const idsToAssign = assigneeCheck.assigneeIds || assigneeIds;
  const notesMap = buildAssigneeNotesMap(assigneeDetails, assigneeNotes);

  if (idsToAssign.length) {
    const insertAssignee = db.prepare(`
      INSERT INTO task_assignees (task_id, user_id, status, personal_description)
      VALUES (?, ?, 'pending', ?)
    `);
    for (const uid of idsToAssign) {
      insertAssignee.run(taskId, uid, notesMap[uid] || '');
    }
  }

  syncTaskOverallStatus(taskId);

  res.status(201).json(getFullTask(taskId, user));
});

router.put('/:id', (req, res) => {
  const user = getUserById(req.user.id);
  const updates = { ...req.body };
  if (updates.priority) {
    updates.priority = String(updates.priority).toLowerCase() === 'normal'
      ? 'medium'
      : String(updates.priority).toLowerCase();
  }
  if (updates.due_at) {
    updates.due_at = new Date(updates.due_at).toISOString();
    updates.due_date = updates.due_at;
  }

  const fields = [];
  const values = [];
  for (const key of ['title', 'description', 'status', 'priority', 'department_id', 'due_at', 'due_date']) {
    if (updates[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (!fields.length) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  fields.push("updated_at = datetime('now')");
  values.push(req.params.id);

  const result = db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }

  res.json(getFullTask(req.params.id, user));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json({ success: true });
});

router.post('/:id/assign', (req, res) => {
  const { userIds = [] } = req.body || {};
  const taskId = req.params.id;

  const user = getUserById(req.user.id);
  if (!canCreateTasks(user)) {
    return res.status(403).json({ error: 'You do not have permission to assign tasks' });
  }

  const task = db.prepare('SELECT id, department_id FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (user.role === 'manager') {
    const managerDeptIds = getManagerDepartmentIds(user.id);
    if (task.department_id && !managerDeptIds.includes(task.department_id)) {
      return res.status(403).json({ error: 'Managers can only assign tasks within their departments' });
    }

    const departmentResult = resolveTaskDepartmentId(user, task.department_id || null);
    if (departmentResult.error) {
      return res.status(403).json({ error: departmentResult.error });
    }
  }

  const assigneeCheck = validateAssignees(user, userIds);
  if (!assigneeCheck.ok) {
    return res.status(403).json({ error: assigneeCheck.error });
  }

  db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(taskId);

  const idsToAssign = assigneeCheck.assigneeIds || userIds;
  if (idsToAssign.length) {
    const insertAssignee = db.prepare(`
      INSERT INTO task_assignees (task_id, user_id, status) VALUES (?, ?, 'pending')
    `);
    for (const uid of idsToAssign) {
      insertAssignee.run(taskId, uid);
    }
  }

  res.json(getFullTask(taskId, user));
});

router.patch('/:taskId/status', (req, res) => {
  const { userId, status, comment } = req.body || {};
  const targetUserId = userId || req.user.id;
  const normalized = normalizeStatus(status);
  const user = getUserById(req.user.id);
  const taskId = req.params.taskId;

  const assignment = db.prepare(`
    SELECT ta.task_id, ta.user_id
    FROM task_assignees ta
    WHERE ta.task_id = ? AND ta.user_id = ?
  `).get(taskId, targetUserId);

  if (!assignment) {
    return res.status(404).json({ error: 'Task assignment not found' });
  }

  if (user.role === 'staff' && targetUserId !== user.id) {
    return res.status(403).json({ error: 'You can only update your own task status' });
  }

  if (targetUserId !== user.id && user.role !== 'admin' && user.role !== 'manager') {
    return res.status(403).json({ error: 'You cannot update this assignee status' });
  }

  db.prepare(`
    UPDATE task_assignees
    SET status = ?, updated_at = datetime('now')
    WHERE task_id = ? AND user_id = ?
  `).run(normalized, taskId, targetUserId);

  if (comment?.trim()) {
    addTaskComment(taskId, user.id, comment, null);
  }

  syncTaskOverallStatus(taskId);

  const row = db.prepare(`
    SELECT user_id, task_id, status, updated_at FROM task_assignees
    WHERE task_id = ? AND user_id = ?
  `).get(taskId, targetUserId);

  res.json({
    ...row,
    assignee_summary: computeAssigneeSummary(taskId),
  });
});

router.post('/:id/follow-up', (req, res) => {
  const user = getUserById(req.user.id);
  const taskId = req.params.id;
  const { userId, personalDescription, personal_description, comment } = req.body || {};
  const targetUserId = userId;
  const followUpText = personalDescription || personal_description || '';

  if (!targetUserId) {
    return res.status(400).json({ error: 'Assignee user ID is required' });
  }

  if (user.role !== 'admin' && user.role !== 'manager') {
    return res.status(403).json({ error: 'Only admins and managers can assign follow-up work' });
  }

  const task = db.prepare('SELECT id, department_id FROM tasks WHERE id = ?').get(taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (user.role === 'manager') {
    const assigneeCheck = validateAssignees(user, [targetUserId]);
    if (!assigneeCheck.ok) {
      return res.status(403).json({ error: assigneeCheck.error });
    }
  }

  const assignment = db.prepare(`
    SELECT user_id FROM task_assignees WHERE task_id = ? AND user_id = ?
  `).get(taskId, targetUserId);

  if (!assignment) {
    return res.status(404).json({ error: 'This team member is not assigned to the task' });
  }

  if (!followUpText.trim() && !comment?.trim()) {
    return res.status(400).json({ error: 'Follow-up instructions or a comment is required' });
  }

  const nextPersonalDescription = followUpText.trim()
    ? followUpText.trim()
    : db.prepare(`
        SELECT personal_description FROM task_assignees WHERE task_id = ? AND user_id = ?
      `).get(taskId, targetUserId)?.personal_description || '';

  db.prepare(`
    UPDATE task_assignees
    SET status = 'pending',
        personal_description = ?,
        updated_at = datetime('now')
    WHERE task_id = ? AND user_id = ?
  `).run(nextPersonalDescription, taskId, targetUserId);

  if (comment?.trim()) {
    addTaskComment(taskId, user.id, comment, null);
  }

  syncTaskOverallStatus(taskId);

  res.json(getFullTask(taskId, user));
});

export default router;
