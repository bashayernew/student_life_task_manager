import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../utils/taskService';
import ProtectedRoute from '../components/ProtectedRoute';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { getStatusBadgeClass, getPriorityBadgeClass, isOverdue, formatDate, getTaskDisplayStatusForUser, getTaskAssigneeSummary } from '../utils/statusUtils';
import Icon from '../components/AppIcon';
import KTechBrand from '../components/KTechBrand';

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

  const isLead = userProfile?.role === 'admin' || userProfile?.role === 'manager';

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.status && filters.status !== 'all') {
        const summary = task.assignee_summary || getTaskAssigneeSummary(task);

        if (isLead) {
          if (filters.status === 'completed' && summary.overall_status !== 'completed') {
            return false;
          }
          if (filters.status === 'pending' && summary.overall_status === 'completed') {
            return false;
          }
        } else {
          const assignees = task.task_assignees || [];
          const userAssignment = assignees.find((a) => {
            const assigneeId = a.user_id || a.user?.id;
            return assigneeId === userProfile?.id;
          });
          let userStatus = userAssignment?.status || 'pending';
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
  }, [tasks, filters, userProfile?.id, isLead]);

  const handleRowClick = (taskId) => {
    navigate(`/task/${taskId}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="ktech-page-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <KTechBrand title="Tasks" onDark titleClassName="text-primary-foreground" />
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="ktech-header-btn"
                >
                  Dashboard
                </Button>
                {userProfile?.role === 'admin' && (
                  <>
                    <Button
                      onClick={() => navigate('/staff')}
                      className="ktech-header-btn"
                    >
                      Staff
                    </Button>
                    <Button
                      onClick={() => navigate('/departments')}
                      className="ktech-header-btn"
                    >
                      Departments
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => navigate('/tasks')}
                  className="ktech-header-btn"
                >
                  Tasks
                </Button>
                <Button
                  onClick={() => navigate('/account')}
                  className="ktech-header-btn"
                >
                  Account
                </Button>
                <Button
                  onClick={handleLogout}
                  className="ktech-header-btn"
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
          <div className="ktech-card p-4 mb-6">
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
              <div className="ktech-spinner"></div>
            </div>
          ) : (
            <div className="ktech-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Due Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-muted-foreground">
                          No tasks found
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => {
                        const displayStatus = getTaskDisplayStatusForUser(task, userProfile);
                        const overdue = isOverdue(task.due_at);
                        return (
                          <tr
                            key={task.id}
                            onClick={() => handleRowClick(task.id)}
                            className="hover:bg-muted cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-foreground">
                                {task.title}
                              </div>
                              {task.description && (
                                <div className="text-sm text-muted-foreground truncate max-w-xs">
                                  {task.description}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {task.department?.name || 'No department'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadgeClass(
                                    displayStatus.badgeStatus
                                  )}`}
                                >
                                  {displayStatus.label}
                                </span>
                                {isLead && displayStatus.summary?.total > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    {displayStatus.summary.completed}/{displayStatus.summary.total} members completed
                                  </p>
                                )}
                              </div>
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
                              <div className={`text-sm ${overdue ? 'text-error font-medium' : 'text-muted-foreground'}`}>
                                {formatDate(task.due_at)}
                                {overdue && (
                                  <span className="ml-2 text-error">
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

