import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../utils/taskService';
import ProtectedRoute from '../components/ProtectedRoute';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { getTaskDisplayStatusForUser, getTaskAssigneeSummary } from '../utils/statusUtils';
import AppPageHeader from '../components/AppPageHeader';
import { TaskListDesktopTable, TaskListMobileCard } from '../components/TaskListViews';

const Tasks = () => {
  const { userProfile } = useAuth();
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
      <div className="ktech-page-shell">
        <AppPageHeader title="Tasks" />

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
              <div className="ktech-mobile-card-list">
                {filteredTasks.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">No tasks found</p>
                ) : (
                  filteredTasks.map((task) => (
                    <TaskListMobileCard
                      key={task.id}
                      task={task}
                      userProfile={userProfile}
                      isLead={isLead}
                      onClick={() => handleRowClick(task.id)}
                    />
                  ))
                )}
              </div>
              <TaskListDesktopTable
                tasks={filteredTasks}
                userProfile={userProfile}
                isLead={isLead}
                onRowClick={handleRowClick}
              />
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Tasks;

