import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../utils/taskService';
import ProtectedRoute from '../components/ProtectedRoute';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { getStatusBadgeClass, getPriorityBadgeClass, isOverdue, formatDate } from '../utils/statusUtils';
import Icon from '../components/AppIcon';

const Tasks = () => {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    department: 'all',
  });

  useEffect(() => {
    loadTasks();
    loadDepartments();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    const { data, error } = await taskService.getTasks();
    if (!error && data) {
      setTasks(data);
    }
    setLoading(false);
  };

  const loadDepartments = async () => {
    const { data } = await taskService.getDepartments();
    if (data) {
      setDepartments(data);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Status filter
      if (filters.status && filters.status !== 'all') {
        const assignees = task.task_assignees || [];
        
        if (userProfile?.role === 'admin') {
          // For admins: check if ANY assignee has the selected status
          // Treat 'in_progress' as 'pending' since they're the same
          const hasMatchingStatus = assignees.some((a) => {
            let assigneeStatus = a.status || 'pending';
            // Map in_progress to pending for filtering
            if (assigneeStatus === 'in_progress') assigneeStatus = 'pending';
            
            return assigneeStatus === filters.status;
          });
          if (!hasMatchingStatus) {
            return false;
          }
        } else {
          // For regular users: only check their own assignment
          const userAssignment = assignees.find((a) => {
            const assigneeId = a.user_id || a.user?.id;
            return assigneeId === userProfile?.id;
          });
          let userStatus = userAssignment?.status || 'pending';
          // Map in_progress to pending for filtering
          if (userStatus === 'in_progress') userStatus = 'pending';
          
          if (userStatus !== filters.status) {
            return false;
          }
        }
      }
      
      // Department filter
      if (filters.department && filters.department !== 'all') {
        const taskDeptId = task.department_id || task.department?.id;
        // Convert both to strings for comparison to handle UUID type differences
        if (String(taskDeptId) !== String(filters.department)) {
          return false;
        }
      }
      
      return true;
    });
  }, [tasks, filters, userProfile?.id, userProfile?.role]);

  const handleRowClick = (taskId) => {
    navigate(`/task/${taskId}`);
  };

  const getTaskStatusForUser = (task) => {
    const assignees = task.task_assignees || [];
    const userAssignment = assignees.find((a) => a.user_id === userProfile?.id);
    return userAssignment?.status || 'pending';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h1 className="text-xl font-bold">Tasks</h1>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="bg-gray-700 hover:bg-gray-600"
                >
                  Dashboard
                </Button>
                {userProfile?.role === 'admin' && (
                  <Button
                    onClick={() => navigate('/staff')}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Manage Staff
                  </Button>
                )}
                <Button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
          {/* Filters */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Status"
                  value={filters.status}
                  onChange={(value) => setFilters({ ...filters, status: value })}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'completed', label: 'Completed' },
                  ]}
                  placeholder="Select status..."
                  className="w-full"
                />
              </div>
              <div>
                <Select
                  label="Department"
                  value={filters.department}
                  onChange={(value) => setFilters({ ...filters, department: value })}
                  options={[
                    { value: 'all', label: 'All Departments' },
                    ...departments.map((dept) => ({
                      value: dept.id,
                      label: dept.name,
                    })),
                  ]}
                  placeholder="Select department..."
                  searchable={true}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Tasks Table */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Due Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                          No tasks found
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => {
                        const taskStatus = getTaskStatusForUser(task);
                        const overdue = isOverdue(task.due_at);
                        return (
                          <tr
                            key={task.id}
                            onClick={() => handleRowClick(task.id)}
                            className="hover:bg-gray-700 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-white">
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="text-sm text-gray-400 truncate max-w-xs">
                                  {task.description}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {task.department?.name || 'No department'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadgeClass(
                                  taskStatus
                                )}`}
                              >
                                {taskStatus.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityBadgeClass(
                                  task.priority
                                )}`}
                              >
                                {task.priority === 'normal' ? 'medium' : (task.priority || 'medium')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${overdue ? 'text-red-400 font-medium' : 'text-gray-300'}`}>
                                {formatDate(task.due_at)}
                                {overdue && (
                                  <span className="ml-2 text-red-400">
                                    <Icon name="AlertCircle" size={14} />
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Tasks;

