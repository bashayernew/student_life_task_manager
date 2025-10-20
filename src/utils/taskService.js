import { supabase } from '../lib/supabase';

/**
 * Enhanced Task Service with Better Error Handling and Schema Alignment
 * Integrates with existing Supabase schema: tasks, profiles, departments, task_assignees
 */

export const taskService = {
  // Get all tasks with assignees and department info
  async getTasks() {
    try {
      const { data, error } = await supabase
        ?.from('tasks')
        ?.select(`
          *,
          created_by:profiles!tasks_created_by_fkey(id, full_name, email, role),
          department:departments(id, name),
          task_assignees(
            user_id,
            status,
            updated_at,
            user:profiles(id, full_name, email, role)
          )
        `)
        ?.order('created_at', { ascending: false });
      
      if (error) {
        return { data: [], error };
      }
      return { data: data || [], error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        return { 
          data: [], 
          error: { 
            message: 'Cannot connect to database. Your Supabase project may be paused or deleted. Please visit your Supabase dashboard to check project status.' 
          } 
        };
      }
      return { data: [], error: { message: 'Failed to load tasks' } };
    }
  },

  // Get tasks assigned to current user
  async getMyTasks(userId) {
    if (!userId) {
      return { data: [], error: { message: 'User ID required' } };
    }

    try {
      const { data, error } = await supabase
        ?.from('task_assignees')
        ?.select(`
          status,
          updated_at,
          task:tasks(
            *,
            created_by:profiles!tasks_created_by_fkey(id, full_name, email, role),
            department:departments(id, name)
          )
        `)
        ?.eq('user_id', userId)
        ?.order('updated_at', { ascending: false });
      
      if (error) {
        return { data: [], error };
      }
      return { data: data || [], error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError')) {
        return { 
          data: [], 
          error: { 
            message: 'Cannot connect to database. Please check your connection and try again.' 
          } 
        };
      }
      return { data: [], error: { message: 'Failed to load assigned tasks' } };
    }
  },

  // Create new task
  async createTask(taskData) {
    try {
      const { data, error } = await supabase
        ?.from('tasks')
        ?.insert([{
          title: taskData?.title,
          details: taskData?.details,
          due_at: taskData?.due_at,
          priority: taskData?.priority || 'normal',
          department_id: taskData?.department_id,
          created_by: taskData?.created_by
        }])
        ?.select(`
          *,
          created_by:profiles!tasks_created_by_fkey(id, full_name, email, role),
          department:departments(id, name)
        `)
        ?.single();
      
      if (error) {
        return { data: null, error };
      }
      return { data, error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch')) {
        return { 
          data: null, 
          error: { message: 'Cannot connect to database. Please check your connection.' } 
        };
      }
      return { data: null, error: { message: 'Failed to create task' } };
    }
  },

  // Assign task to users
  async assignTask(taskId, userIds) {
    if (!taskId) {
      return { data: null, error: { message: 'Task ID required' } };
    }

    try {
      // First, remove existing assignments
      await supabase
        ?.from('task_assignees')
        ?.delete()
        ?.eq('task_id', taskId);

      // Then add new assignments
      if (userIds?.length > 0) {
        const assignments = userIds?.map(userId => ({
          task_id: taskId,
          user_id: userId,
          status: 'pending'
        }));

        const { data, error } = await supabase
          ?.from('task_assignees')
          ?.insert(assignments)
          ?.select(`
            *,
            user:profiles(id, full_name, email, role)
          `);

        if (error) {
          return { data: null, error };
        }
        return { data, error: null };
      }

      return { data: [], error: null };
    } catch (error) {
      return { data: null, error: { message: 'Failed to assign task' } };
    }
  },

  // Update task status for assignee
  async updateTaskStatus(taskId, userId, status) {
    if (!taskId || !userId || !status) {
      return { data: null, error: { message: 'Task ID, User ID, and status are required' } };
    }

    try {
      const { data, error } = await supabase
        ?.from('task_assignees')
        ?.update({ 
          status,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('task_id', taskId)
        ?.eq('user_id', userId)
        ?.select(`
          *,
          user:profiles(id, full_name, email, role)
        `);
      
      if (error) {
        return { data: null, error };
      }
      return { data: data?.[0] || null, error: null };
    } catch (error) {
      return { data: null, error: { message: 'Failed to update task status' } };
    }
  },

  // Update task details
  async updateTask(taskId, updates) {
    if (!taskId) {
      return { data: null, error: { message: 'Task ID required' } };
    }

    try {
      const { data, error } = await supabase
        ?.from('tasks')
        ?.update(updates)
        ?.eq('id', taskId)
        ?.select(`
          *,
          created_by:profiles!tasks_created_by_fkey(id, full_name, email, role),
          department:departments(id, name)
        `)
        ?.single();
      
      if (error) {
        return { data: null, error };
      }
      return { data, error: null };
    } catch (error) {
      return { data: null, error: { message: 'Failed to update task' } };
    }
  },

  // Delete task
  async deleteTask(taskId) {
    if (!taskId) {
      return { error: { message: 'Task ID required' } };
    }

    try {
      const { error } = await supabase
        ?.from('tasks')
        ?.delete()
        ?.eq('id', taskId);
      
      return { error };
    } catch (error) {
      return { error: { message: 'Failed to delete task' } };
    }
  },

  // Get departments
  async getDepartments() {
    try {
      const { data, error } = await supabase
        ?.from('departments')
        ?.select('*')
        ?.order('name');
      
      if (error) {
        return { data: [], error };
      }
      return { data: data || [], error: null };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch')) {
        return { 
          data: [], 
          error: { message: 'Cannot connect to database. Please check your connection.' } 
        };
      }
      return { data: [], error: { message: 'Failed to load departments' } };
    }
  },

  // Get staff members for assignment
  async getStaffMembers() {
    try {
      const { data, error } = await supabase
        ?.from('profiles')
        ?.select('id, full_name, email, role, department_id')
        ?.eq('role', 'staff')
        ?.order('full_name');
      
      if (error) {
        return { data: [], error };
      }
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error: { message: 'Failed to load staff members' } };
    }
  },

  // Get task statistics
  async getTaskStats(userId = null) {
    try {
      let query = supabase?.from('tasks')?.select('*, task_assignees(status)', { count: 'exact' });
      
      if (userId) {
        query = query?.eq('task_assignees.user_id', userId);
      }

      const { data, error, count } = await query;
      
      if (error) {
        return { data: null, error };
      }

      const stats = {
        total: count || 0,
        pending: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0
      };

      data?.forEach(task => {
        const now = new Date();
        const dueDate = new Date(task?.due_at);
        const isOverdue = dueDate < now;

        if (task?.task_assignees?.length > 0) {
          task?.task_assignees?.forEach(assignment => {
            if (assignment?.status === 'pending') {
              stats.pending++;
              if (isOverdue) stats.overdue++;
            } else if (assignment?.status === 'in_progress') {
              stats.in_progress++;
              if (isOverdue) stats.overdue++;
            } else if (assignment?.status === 'completed') {
              stats.completed++;
            }
          });
        } else {
          stats.pending++;
          if (isOverdue) stats.overdue++;
        }
      });

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: { message: 'Failed to load task statistics' } };
    }
  }
};

export default taskService;