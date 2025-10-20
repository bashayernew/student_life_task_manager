import React, { useState, useEffect } from 'react';
import { taskService } from '../../../utils/taskService';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TaskOverviewTable = ({ onTaskUpdate, refreshTrigger }) => {
  // Remove mock data arrays - use Supabase data only
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Load tasks from Supabase - REPLACE MOCK DATA
  useEffect(() => {
    loadTasks();
  }, [refreshTrigger]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: taskError } = await taskService?.getTasks();
      
      if (taskError) {
        setError('Failed to load tasks: ' + taskError?.message);
        return;
      }

      setTasks(data || []);
    } catch (error) {
      setError('Failed to load tasks. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // ... keep existing utility functions ...
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-blue-600 bg-blue-100',
      normal: 'text-gray-600 bg-gray-100',
      high: 'text-orange-600 bg-orange-100',
      urgent: 'text-red-600 bg-red-100'
    };
    return colors?.[priority] || colors?.normal;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      in_progress: 'text-blue-600 bg-blue-100',
      completed: 'text-green-600 bg-green-100'
    };
    return colors?.[status] || colors?.pending;
  };

  const isTaskOverdue = (dueAt) => {
    return new Date(dueAt) < new Date();
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) {
      return;
    }

    try {
      const { error } = await taskService?.deleteTask(taskId);
      
      if (error) {
        alert('Failed to delete task: ' + error?.message);
        return;
      }

      // Refresh tasks after deletion
      loadTasks();
      onTaskUpdate?.();
    } catch (error) {
      alert('Failed to delete task. Please try again.');
    }
  };

  // Filter and sort tasks
  const filteredTasks = tasks?.filter(task => {
    // Status filter
    if (filterStatus !== 'all') {
      const taskStatuses = task?.task_assignees?.map(a => a?.status) || ['pending'];
      if (!taskStatuses?.includes(filterStatus)) {
        return false;
      }
    }
    
    // Priority filter
    if (filterPriority !== 'all' && task?.priority !== filterPriority) {
      return false;
    }
    
    return true;
  })?.sort((a, b) => {
    const aValue = a?.[sortField];
    const bValue = b?.[sortField];
    
    if (sortField === 'due_at') {
      const dateA = new Date(aValue);
      const dateB = new Date(bValue);
      return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
    }
    if (sortField === 'priority') {
      const priorityOrder = { low: 1, normal: 2, high: 3, urgent: 4 };
      const aPriority = priorityOrder?.[aValue] || 1;
      const bPriority = priorityOrder?.[bValue] || 1;
      return sortDirection === 'asc' ? aPriority - bPriority : bPriority - aPriority;
    }
    if (sortField === 'department') {
      const getDepartmentName = (department) => {
        if (typeof department === 'object' && department?.name) {
          return department?.name;
        }
        if (typeof department === 'string') {
          return department;
        }
        return 'No Department';
      };
      const aDeptName = getDepartmentName(a?.department);
      const bDeptName = getDepartmentName(b?.department);
      if (aDeptName < bDeptName) return sortDirection === 'asc' ? -1 : 1;
      if (aDeptName > bDeptName) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }
    // Default comparison
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // ... keep existing JSX but update with real data ...
  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-muted-foreground">Loading tasks...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow-sm">
        <div className="p-6">
          <div className="text-center py-12">
            <Icon name="AlertTriangle" size={48} className="text-error mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Tasks</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={loadTasks} variant="outline">
              <Icon name="RefreshCw" size={16} className="mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm">
      {/* Header with filters */}
      <div className="p-6 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0">
          <h2 className="text-lg font-semibold text-foreground">All Tasks</h2>
          
          <div className="flex items-center space-x-4">
            {/* Status Filter */}
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e?.target?.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            {/* Priority Filter */}
            <select 
              value={filterPriority}
              onChange={(e) => setFilterPriority(e?.target?.value)}
              className="px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
            >
              <option value="all">All Priority</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            {/* Refresh Button */}
            <Button onClick={loadTasks} variant="outline" size="sm">
              <Icon name="RefreshCw" size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-4 font-medium text-foreground">Task</th>
              <th className="text-left p-4 font-medium text-foreground">Assignees</th>
              <th className="text-left p-4 font-medium text-foreground">Priority</th>
              <th className="text-left p-4 font-medium text-foreground">Due Date</th>
              <th className="text-left p-4 font-medium text-foreground">Department</th>
              <th className="text-left p-4 font-medium text-foreground">Status</th>
              <th className="text-left p-4 font-medium text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks?.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-12">
                  <Icon name="Clipboard" size={48} className="text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No tasks found</p>
                </td>
              </tr>
            ) : (
              filteredTasks?.map((task) => (
                <tr key={task?.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-4">
                    <div>
                      <h3 className="font-medium text-foreground">{task?.title}</h3>
                      {task?.details && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {task?.details}
                        </p>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <div className="space-y-1">
                      {task?.task_assignees?.length === 0 ? (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      ) : (
                        task?.task_assignees?.slice(0, 2)?.map((assignment) => (
                          <div key={assignment?.user_id} className="flex items-center space-x-2">
                            <span className="text-sm text-foreground">
                              {assignment?.user?.full_name}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(assignment?.status)}`}>
                              {assignment?.status?.replace('_', ' ')}
                            </span>
                          </div>
                        ))
                      )}
                      {task?.task_assignees?.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{task?.task_assignees?.length - 2} more
                        </span>
                      )}
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPriorityColor(task?.priority)}`}>
                      {task?.priority}
                    </span>
                  </td>
                  
                  <td className="p-4">
                    <div className="text-sm text-foreground">
                      {new Date(task?.due_at)?.toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(task?.due_at)?.toLocaleTimeString()}
                    </div>
                    {isTaskOverdue(task?.due_at) && (
                      <div className="text-xs text-error font-medium mt-1">Overdue</div>
                    )}
                  </td>
                  
                  <td className="p-4">
                    <span className="text-sm text-foreground">
                      {task?.department?.name || 'No Department'}
                    </span>
                  </td>
                  
                  <td className="p-4">
                    {task?.task_assignees?.length === 0 ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-600">
                        Pending
                      </span>
                    ) : (
                      <div className="space-y-1">
                        {Array?.from(new Set(task?.task_assignees?.map(a => a?.status)))?.map(status => (
                          <span key={status} className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                            {status?.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task?.id)}
                        className="text-error hover:text-error hover:bg-error/10"
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskOverviewTable;