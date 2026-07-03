import api, { apiRequest } from '../lib/api';
import { STATUS, normalizeStatus } from '../constants/status';

export const taskService = {
  async getTasks() {
    const { data, error } = await apiRequest('get', '/tasks');
    return { data: data || [], error };
  },

  async getMyTasks(userId) {
    if (!userId) {
      return { data: [], error: { message: 'User ID required' } };
    }
    const { data, error } = await apiRequest('get', `/tasks/my?userId=${encodeURIComponent(userId)}`);
    return { data: data || [], error };
  },

  async getTask(taskId) {
    if (!taskId) {
      return { data: null, error: { message: 'Task ID required' } };
    }
    const { data, error } = await apiRequest('get', `/tasks/${taskId}`);
    return { data, error };
  },

  async getTaskComments(taskId) {
    if (!taskId) {
      return { data: [], error: { message: 'Task ID required' } };
    }
    const { data, error } = await apiRequest('get', `/tasks/${taskId}/comments`);
    return { data: data || [], error };
  },

  async addTaskComment(taskId, { body, parentId = null, recipientIds = null }) {
    if (!taskId || !body?.trim()) {
      return { data: null, error: { message: 'Task ID and comment text are required' } };
    }
    const payload = {
      body,
      parentId,
    };
    if (Array.isArray(recipientIds)) {
      payload.recipientIds = recipientIds;
    }
    const { data, error } = await apiRequest('post', `/tasks/${taskId}/comments`, payload);
    return { data, error };
  },

  async createTask(taskData) {
    const { data, error } = await apiRequest('post', '/tasks', taskData);
    return { data, error };
  },

  async assignTask(taskId, userIds) {
    if (!taskId) {
      return { data: null, error: { message: 'Task ID required' } };
    }
    const { data, error } = await apiRequest('post', `/tasks/${taskId}/assign`, { userIds });
    return { data, error };
  },

  async updateTaskStatus(taskId, userId, status, comment = '') {
    if (!taskId || !userId || !status) {
      return { data: null, error: { message: 'Task ID, User ID, and status are required' } };
    }
    const { data, error } = await apiRequest('patch', `/tasks/${taskId}/status`, {
      userId,
      status: normalizeStatus(status),
      comment: comment || undefined,
    });
    return { data, error };
  },

  async reopenAssignee(taskId, userId, comment = '') {
    return this.updateTaskStatus(taskId, userId, 'pending', comment);
  },

  async followUpAssignee(taskId, { userId, personalDescription, comment }) {
    if (!taskId || !userId) {
      return { data: null, error: { message: 'Task ID and user ID are required' } };
    }
    const { data, error } = await apiRequest('post', `/tasks/${taskId}/follow-up`, {
      userId,
      personalDescription,
      comment,
    });
    return { data, error };
  },

  async updateTask(taskId, updates) {
    if (!taskId) {
      return { data: null, error: { message: 'Task ID required' } };
    }
    const { data, error } = await apiRequest('put', `/tasks/${taskId}`, updates);
    return { data, error };
  },

  async deleteTask(taskId) {
    if (!taskId) {
      return { error: { message: 'Task ID required' } };
    }
    const { error } = await apiRequest('delete', `/tasks/${taskId}`);
    return { error };
  },

  async getDepartments() {
    const { data, error } = await apiRequest('get', '/departments');
    return { data: data || [], error };
  },

  async getStaffMembers() {
    const { data, error } = await apiRequest('get', '/staff/assignable');
    return { data: data || [], error };
  },

  async getTaskStats(userId = null) {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    const { data, error } = await apiRequest('get', `/tasks/stats${query}`);
    return { data, error };
  },
};

export async function setMyTaskStatus({ userId, taskId, status, comment = '' }) {
  const normalized = normalizeStatus(status);
  const { data, error } = await apiRequest('patch', `/tasks/${taskId}/status`, {
    userId,
    status: normalized,
    comment: comment || undefined,
  });
  if (error) throw new Error(error.message);
  return data;
}

export default taskService;
