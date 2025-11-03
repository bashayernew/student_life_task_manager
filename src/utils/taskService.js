import { supabase } from '../lib/supabase';
import { STATUS, normalizeStatus } from '../constants/status';

/**
 * Task Service - Simplified to avoid RLS recursion issues
 * Uses minimal inserts and view-based reads
 */

export const taskService = {
  // Get all tasks with assignees and department info
  async getTasks() {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
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
        .order('created_at', { ascending: false });
      
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

  // Get tasks assigned to current user (using view to avoid RLS issues)
  async getMyTasks(userId) {
    if (!userId) {
      return { data: [], error: { message: 'User ID required' } };
    }

    try {
      // Prefer the expanded view for reads
      const { data, error } = await supabase
        .from('v_task_assignees_expanded')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return { data: data || [], error: null };
      }

      // Fallback (non-view)
      const { data: fallback } = await supabase
        .from('task_assignees')
        .select(`
          status, updated_at,
          task:tasks(*, department:departments(id,name), created_by:profiles(id,full_name,email,role))
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      const transformed = (fallback ?? []).map(r => ({ ...r.task, assignee_status: r.status, updated_at: r.updated_at }));
      return { data: transformed, error: null };
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

  // Create new task (minimal insert, then assignees, then fetch from view)
  async createTask(taskData) {
    try {
      // Normalize priority: map 'normal' to 'medium', ensure lowercase
      const rawPriority = taskData?.priority || 'medium';
      const safePriority = String(rawPriority).toLowerCase() === 'normal'
        ? 'medium'
        : String(rawPriority).toLowerCase();

      // Convert due_at to ISO string if needed
      const dueAtISO = taskData?.due_at 
        ? (taskData.due_at instanceof Date ? taskData.due_at.toISOString() : new Date(taskData.due_at).toISOString())
        : null;

      // 1) Create task (minimal returning)
      const { data: created, error: createErr } = await supabase
        .from('tasks')
        .insert([{
          title: taskData?.title,
          description: taskData?.details || taskData?.description || '',
          due_at: dueAtISO,
          priority: safePriority,
          department_id: taskData?.department_id || null,
          created_by: taskData?.created_by || taskData?.userId
        }])
        .select('id')
        .single();

      if (createErr) {
        return { data: null, error: createErr };
      }

      const taskId = created.id;

      // 2) Bulk assign users (if any)
      const assigneeIds = taskData?.assigneeIds || [];
      if (assigneeIds.length) {
        const rows = assigneeIds.map(uid => ({ task_id: taskId, user_id: uid, status: STATUS.PENDING }));
        const { error: assignErr } = await supabase
          .from('task_assignees')
          .insert(rows);

        if (assignErr) {
          return { data: null, error: assignErr };
        }
      }

      // 3) Return expanded task for UI via server-side join view if present, else minimal
      const { data: expanded, error: viewErr } = await supabase
        .from('v_task_assignees_expanded')
        .select('*')
        .eq('task_id', taskId)
        .maybeSingle();

      if (!viewErr && expanded) {
        return { data: expanded, error: null };
      }

      // Fallback to minimal task data
      return { 
        data: { 
          id: taskId, 
          title: taskData?.title, 
          description: taskData?.details || taskData?.description || '', 
          priority: safePriority, 
          department_id: taskData?.department_id || null, 
          due_at: dueAtISO 
        }, 
        error: null 
      };
    } catch (error) {
      if (error?.message?.includes('Failed to fetch')) {
        return { 
          data: null, 
          error: { message: 'Cannot connect to database. Please check your connection.' } 
        };
      }
      return { data: null, error: { message: error?.message || 'Failed to create task' } };
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
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId);

      // Then add new assignments
      if (userIds?.length > 0) {
        const assignments = userIds.map(userId => ({
          task_id: taskId,
          user_id: userId,
          status: 'pending'
        }));

        const { data, error } = await supabase
          .from('task_assignees')
          .insert(assignments)
          .select('task_id');

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
      const normalized = normalizeStatus(status);
      const { data, error } = await supabase
        .from('task_assignees')
        .update({ status: normalized, updated_at: new Date().toISOString() })
        .eq('task_id', taskId)
        .eq('user_id', userId)
        .select('user_id, task_id, status, updated_at')
        .maybeSingle();

      if (error) {
        return { data: null, error };
      }
      return { data, error: null };
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
      // Normalize priority if provided
      if (updates.priority) {
        const rawPriority = updates.priority;
        updates.priority = String(rawPriority).toLowerCase() === 'normal'
          ? 'medium'
          : String(rawPriority).toLowerCase();
      }

      // Convert due_at to ISO if provided
      if (updates.due_at) {
        updates.due_at = updates.due_at instanceof Date 
          ? updates.due_at.toISOString() 
          : new Date(updates.due_at).toISOString();
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

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
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        return { error };
      }
      return { error: null };
    } catch (error) {
      return { error: { message: 'Failed to delete task' } };
    }
  },

  // Get departments
  async getDepartments() {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, created_at')
        .order('name');
      
      if (error) {
        console.error('Department query error:', error);
        // If it's an RLS error, return empty array instead of failing
        if (error.code === '42501' || error.message?.includes('permission')) {
          return { data: [], error: null };
        }
        return { data: [], error };
      }
      return { data: data || [], error: null };
    } catch (error) {
      console.error('Department query exception:', error);
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
        .from('profiles')
        .select('id, full_name, email, role, department_id')
        .eq('role', 'staff')
        .order('full_name');
      
      if (error) {
        return { data: [], error };
      }
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error: { message: 'Failed to load staff members' } };
    }
  },

  // Get task stats
  async getTaskStats(userId = null) {
    try {
      let query = supabase.from('tasks').select('*, task_assignees(status)', { count: 'exact' });
      
      if (userId) {
        query = query.eq('task_assignees.user_id', userId);
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

      const now = new Date();
      data?.forEach(task => {
        if (task?.task_assignees?.length > 0) {
          task.task_assignees.forEach(assignment => {
            if (assignment.status === 'pending') stats.pending++;
            if (assignment.status === 'in_progress') stats.in_progress++;
            if (assignment.status === 'completed') stats.completed++;
          });
        }

        if (task.due_at && new Date(task.due_at) < now) {
          if (!task.task_assignees?.some(a => a.status === 'completed')) {
            stats.overdue++;
          }
        }
      });

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: { message: 'Failed to load task stats' } };
    }
  },
};

// Helper function to set task status (exported for use in components)
export async function setMyTaskStatus({ supabase, userId, taskId, status }) {
  const normalized = normalizeStatus(status);
  const { data, error } = await supabase
    .from('task_assignees')
    .update({ status: normalized })
    .eq('user_id', userId)
    .eq('task_id', taskId)
    .select('user_id, task_id, status, updated_at')
    .maybeSingle();

  if (error) throw error;
  return data;
}
