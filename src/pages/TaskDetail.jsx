import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taskService } from '../utils/taskService';
import ProtectedRoute from '../components/ProtectedRoute';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { getStatusBadgeClass, getPriorityBadgeClass, isOverdue, formatDateTime } from '../utils/statusUtils';
import Icon from '../components/AppIcon';

const TaskDetail = () => {
  const { id } = useParams();
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [userStatus, setUserStatus] = useState('pending');

  useEffect(() => {
    loadTask();
  }, [id]);

  const loadTask = async () => {
    setLoading(true);
    const { data, error } = await taskService.getTasks();
    if (!error && data) {
      const foundTask = data.find((t) => t.id === id);
      if (foundTask) {
        setTask(foundTask);
        const assignees = foundTask.task_assignees || [];
        const userAssignment = assignees.find((a) => a.user_id === userProfile?.id);
        if (userAssignment) {
          setUserStatus(userAssignment.status);
        }
      }
    }
    setLoading(false);
  };

  const handleStatusChange = async (newStatus) => {
    if (!task || !userProfile) return;

    setUpdating(true);
    const { error } = await taskService.updateTaskStatus(task.id, userProfile.id, newStatus);
    if (!error) {
      setUserStatus(newStatus);
      await loadTask();
    }
    setUpdating(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!task) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Task not found</h1>
            <Button onClick={() => navigate('/tasks')}>Back to Tasks</Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const overdue = isOverdue(task.due_at);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center h-auto sm:h-16 py-3 sm:py-0 gap-3 sm:gap-4">
              <div className="w-full sm:w-auto">
                <Button
                  onClick={() => navigate('/tasks')}
                  className="bg-gray-700 hover:bg-gray-600 text-xs sm:text-sm w-full sm:w-auto"
                >
                  <Icon name="ArrowLeft" size={14} className="sm:mr-2" />
                  <span className="hidden sm:inline">Back to Tasks</span>
                  <span className="sm:hidden">Back</span>
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button
                  onClick={() => navigate('/dashboard')}
                  className="bg-gray-700 hover:bg-gray-600 text-xs sm:text-sm flex-1 sm:flex-none min-w-[100px]"
                >
                  Dashboard
                </Button>
                <Button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-xs sm:text-sm flex-1 sm:flex-none min-w-[100px]"
                >
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
          <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
            {/* Title */}
            <div className="mb-4 sm:mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2 break-words">{task.title}</h1>
              <div className="flex items-center gap-4 flex-wrap">
                <span
                  className={`px-3 py-1 text-sm font-medium rounded border ${getStatusBadgeClass(
                    userStatus
                  )}`}
                >
                  {userStatus.replace('_', ' ')}
                </span>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded border ${getPriorityBadgeClass(
                    task.priority
                  )}`}
                >
                  {task.priority === 'normal' ? 'medium' : (task.priority || 'medium')}
                </span>
                {overdue && (
                  <span className="px-3 py-1 text-sm font-medium rounded bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-2">
                    <Icon name="AlertCircle" size={16} />
                    Overdue
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-gray-300 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Department</h3>
                <p className="text-white">{task.department?.name || 'No department'}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Created By</h3>
                <p className="text-white">
                  {task.created_by?.full_name || task.created_by?.email || 'Unknown'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Due Date</h3>
                <p className={overdue ? 'text-red-400 font-medium' : 'text-white'}>
                  {formatDateTime(task.due_at)}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Created At</h3>
                <p className="text-white">{formatDateTime(task.created_at)}</p>
              </div>
            </div>

            {/* Status Update */}
            <div className="border-t border-gray-700 pt-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Update Your Status
              </label>
              <Select
                value={userStatus}
                onChange={(value) => handleStatusChange(value)}
                disabled={updating}
                      options={[
                        { value: 'pending', label: 'Pending' },
                        { value: 'completed', label: 'Completed' },
                      ]}
                className="w-full md:w-64"
              />
            </div>

            {/* Assignees */}
            {task.task_assignees && task.task_assignees.length > 0 && (
              <div className="border-t border-gray-700 pt-6 mt-6">
                <h3 className="text-lg font-semibold mb-4">Assignees</h3>
                <div className="space-y-2">
                  {task.task_assignees.map((assignee) => (
                    <div
                      key={assignee.user_id}
                      className="flex items-center justify-between bg-gray-700 rounded p-3"
                    >
                      <div>
                        <p className="text-white font-medium">
                          {assignee.user?.full_name || assignee.user?.email || 'Unknown'}
                        </p>
                        <p className="text-sm text-gray-400">{assignee.user?.role}</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded border ${getStatusBadgeClass(
                          assignee.status
                        )}`}
                      >
                        {assignee.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default TaskDetail;

