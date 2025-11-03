import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taskService, setMyTaskStatus } from '../utils/taskService';
import { staffService } from '../utils/staffService';
import ProtectedRoute from '../components/ProtectedRoute';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Icon from '../components/AppIcon';
import { PRIORITIES } from '../constants/priorities';
import { STATUS } from '../constants/status';
import { supabase } from '../lib/supabase';

const Dashboard = () => {
  const { userProfile, user, signOut, loading: authLoading, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pending: 0,
    in_progress: 0,
    completed: 0,
    overdue: 0,
  });
  const [teamTasks, setTeamTasks] = useState([]);
  const [loadingTeamTasks, setLoadingTeamTasks] = useState(false);
  const [loading, setLoading] = useState(true);
  const [myTasks, setMyTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('due'); // 'due' or 'previous'
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [departments, setDepartments] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    due_at: '',
    priority: 'medium',
    department_id: '',
  });
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [taskSuccess, setTaskSuccess] = useState('');

  useEffect(() => {
    // Wait for auth and profile to load before fetching data
    if (!authLoading && !profileLoading && userProfile?.id) {
      loadStats();
      if (userProfile?.role === 'admin') {
        loadDepartments();
        loadStaffMembers(); // This will trigger loadTeamMemberTasks after staff are loaded
      }
    }
  }, [authLoading, profileLoading, userProfile?.id, userProfile?.role]);

  // Reload staff members when showing create task form
  useEffect(() => {
    if (showCreateTask && userProfile?.role === 'admin') {
      loadStaffMembers();
    }
  }, [showCreateTask]);

  // Auto-refresh stats every 10 seconds for admins to see live updates
  useEffect(() => {
    if (userProfile?.role === 'admin' && userProfile?.id && !authLoading && !profileLoading) {
      const interval = setInterval(() => {
        // Silent auto-refresh (no console log to reduce noise)
        loadStats();
        if (staffMembers.length > 0) {
          loadTeamMemberTasks(staffMembers);
        }
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [userProfile?.role, userProfile?.id, authLoading, profileLoading, staffMembers.length]);

  const loadDepartments = async () => {
    const { data } = await taskService.getDepartments();
    if (data) setDepartments(data);
  };

  const loadStaffMembers = async () => {
    const { data } = await staffService.getStaff();
    if (data) {
      // Filter to show only staff members (not admins)
      const staff = data.filter(member => member.role === 'staff');
      setStaffMembers(staff);
      // After loading staff, load their tasks
      if (userProfile?.role === 'admin') {
        loadTeamMemberTasks(staff);
      }
    }
  };

  const loadTeamMemberTasks = async (staffList = staffMembers) => {
    if (userProfile?.role !== 'admin') return;
    
    setLoadingTeamTasks(true);
    try {
      // Get all tasks (admins can see all tasks) - including completed ones
      const { data: allTasks, error } = await taskService.getTasks();
      
      if (!error && allTasks) {
        // Filter tasks that are assigned to staff members (not the admin)
        // Include ALL tasks regardless of status (pending, in_progress, completed, etc.)
        const staffIds = (staffList.length > 0 ? staffList : staffMembers).map(m => m.id);
        const tasksAssignedToTeam = allTasks.filter(task => {
          const assignees = task.task_assignees || [];
          // Check if any assignee is a staff member (not admin)
          return assignees.some(assignee => {
            const assigneeId = assignee.user_id || assignee.user?.id;
            // Include task if assigned to a staff member, regardless of status
            return staffIds.includes(assigneeId);
          });
        });
        
        // Loaded tasks (logging removed to reduce console noise)
        setTeamTasks(tasksAssignedToTeam);
        // Reload stats after team tasks update
        await loadStats();
      }
    } catch (error) {
      console.error('Error loading team member tasks:', error);
    } finally {
      setLoadingTeamTasks(false);
    }
  };

  const loadStats = async () => {
    if (!userProfile?.id) {
      console.warn('Cannot load stats: userProfile.id is missing');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // For admins, load all tasks (including team member tasks)
    // For regular users, load only their tasks
    let data = [];
    if (userProfile?.role === 'admin') {
      const { data: allTasks, error: tasksError } = await taskService.getTasks();
      if (!tasksError && allTasks) {
        // Flatten all task assignments for stats
        allTasks.forEach(task => {
          const assignees = task.task_assignees || [];
          assignees.forEach(assignee => {
            data.push({
              status: assignee.status || 'pending',
              due_at: task.due_at || task.due_date,
              due_date: task.due_at || task.due_date,
              task_id: task.id,
              user_id: assignee.user_id || assignee.user?.id,
              title: task.title,
              description: task.description,
            });
          });
        });
      }
    } else {
      const { data: myTasks, error } = await taskService.getMyTasks(userProfile.id);
      if (!error && myTasks) {
        data = myTasks;
      } else if (error) {
        console.error('Error loading tasks:', error);
        setLoading(false);
        return;
      }
    }
    
    if (data && Array.isArray(data)) {
      // Store tasks for display (filter to current user's tasks only)
      if (userProfile?.role !== 'admin') {
        setMyTasks(data);
      } else {
        // For admin, show their own tasks in "My Tasks" section
        const { data: myOwnTasks } = await taskService.getMyTasks(userProfile.id);
        if (myOwnTasks) {
          setMyTasks(myOwnTasks);
        }
      }
      
      const counts = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        overdue: 0,
      };

      const now = new Date();
      
      // Handle both view format (flat) and nested format (fallback)
      data.forEach((item) => {
        let status = 'pending';
        let dueDate = null;
        
        // Check if it's the view format (flat structure from v_task_assignees_expanded)
        if (item.status !== undefined && item.task_id) {
          // View format: flat structure - fields are at root level
          status = item.status || 'pending';
          dueDate = item.due_date || item.due_at || item.task_due_at || item.task_due_date;
        } 
        // Check if it's nested format (fallback from task_assignees join)
        else if (item.task && item.task.id) {
          // Nested format: { status, task: { ... } }
          status = item.status || item.assignee_status || 'pending';
          dueDate = item.task.due_at || item.task.due_date;
        } 
        // Check if it's transformed format (already flattened)
        else if (item.id && (item.assignee_status || item.status)) {
          // Direct task format with assignee_status
          status = item.assignee_status || item.status || 'pending';
          dueDate = item.due_at || item.due_date;
        }
        // If we have status but can't determine structure, try common field names
        else if (item.status) {
          status = item.status;
          dueDate = item.due_at || item.due_date || item.due_date || null;
        }
        
        // Count by status
        if (status === 'pending') counts.pending++;
        if (status === 'in_progress') counts.in_progress++;
        if (status === 'completed') counts.completed++;
        
        // Check if overdue
        if (dueDate) {
          try {
            const due = new Date(dueDate);
            if (due < now && status !== 'completed') {
              counts.overdue++;
            }
          } catch (e) {
            console.warn('Invalid date format:', dueDate);
          }
        }
      });

      // Stats calculated (logging removed to reduce console noise)
      setStats(counts);
    } else {
      console.warn('No task data or invalid format:', data);
    }
    setLoading(false);
  };

  const handleMarkAsDone = async (taskItem) => {
    if (!userProfile?.id || !user?.id) {
      console.error('No user profile ID or session');
      alert('Please log in again');
      return;
    }
    
    // Extract task ID - handle different data formats
    let taskId = null;
    if (taskItem.task_id) {
      taskId = taskItem.task_id;
    } else if (taskItem.id) {
      taskId = taskItem.id;
    } else if (taskItem.task?.id) {
      taskId = taskItem.task.id;
    }
    
    if (!taskId) {
      console.error('Cannot find task ID in:', taskItem);
      alert('Error: Could not find task ID. Please refresh the page and try again.');
      return;
    }
    
    try {
      await setMyTaskStatus({ 
        supabase, 
        userId: user.id, 
        taskId: taskId, 
        status: STATUS.COMPLETED 
      });
      
      // Reload stats and tasks
      await loadStats();
      setTaskSuccess('Task marked as completed!');
      setTimeout(() => setTaskSuccess(''), 3000);
    } catch (error) {
      console.error('Exception updating task:', error);
      alert('Failed to update task: ' + (error.message || 'Please try again.'));
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setTaskFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setTaskError('');
    setTaskSuccess('');
  };

  const handleAssigneeToggle = (staffId) => {
    setSelectedAssignees(prev =>
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    setTaskError('');
    setTaskSuccess('');

    if (!taskFormData.title?.trim()) {
      setTaskError('Task title is required');
      return;
    }

            if (!taskFormData.due_at) {
      setTaskError('Due date is required');
      return;
    }

    if (selectedAssignees.length === 0) {
      setTaskError('Please select at least one team member to assign this task');
      return;
    }

    setCreatingTask(true);

    try {
      // Create task with assignees in one call (createTask now handles both)
      const taskData = {
        title: taskFormData.title,
        details: taskFormData.description || '',
        due_at: taskFormData.due_at, // service will convert to ISO
        priority: taskFormData.priority,
        department_id: taskFormData.department_id || null,
        created_by: user?.id,
        assigneeIds: selectedAssignees // pass assignees to createTask
      };

      const { data: newTask, error: taskError } = await taskService.createTask(taskData);

      if (taskError) {
        setTaskError('Failed to create task: ' + taskError.message);
        setCreatingTask(false);
        return;
      }

            // Reset form
            setTaskFormData({
              title: '',
              description: '',
              due_at: '',
              priority: 'medium',
              department_id: '',
            });
      setSelectedAssignees([]);
      setTaskSuccess('Task created and assigned successfully!');
      setShowCreateTask(false);
      
      // Reload stats after a moment
      setTimeout(() => {
        loadStats();
        if (userProfile?.role === 'admin') {
          loadTeamMemberTasks(staffMembers);
        }
      }, 500);
    } catch (error) {
      setTaskError('An unexpected error occurred. Please try again.');
    } finally {
      setCreatingTask(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h1 className="text-xl font-bold">Task Manager</h1>
                <p className="text-sm text-gray-400">Welcome, {userProfile?.full_name || userProfile?.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => navigate('/tasks')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  View Tasks
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
                  <Icon name="LogOut" size={16} className="mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
                {userProfile?.role === 'admin' ? 'All Tasks by Status' : 'My Tasks by Status'}
              </h2>
              <p className="text-sm sm:text-base text-gray-400">
                {userProfile?.role === 'admin' 
                  ? 'Overview of all tasks (including team member tasks)' 
                  : 'Overview of your assigned tasks'}
              </p>
            </div>
            {userProfile?.role === 'admin' && (
              <Button
                onClick={() => setShowCreateTask(true)}
                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
              >
                <Icon name="Plus" size={16} className="mr-2" />
                Create Task
              </Button>
            )}
          </div>

          {/* Create Task Modal/Form */}
          {showCreateTask && userProfile?.role === 'admin' && (
            <div className="mb-6 sm:mb-8 bg-gray-800 rounded-lg border border-gray-700 p-4 sm:p-6">
              {/* Refresh button to reload staff members */}
              <div className="mb-4 flex justify-end">
                <Button
                  type="button"
                  onClick={async () => {
                    await loadStaffMembers();
                    setTaskSuccess('Staff list refreshed');
                    setTimeout(() => setTaskSuccess(''), 2000);
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-xs sm:text-sm w-full sm:w-auto"
                >
                  <Icon name="RefreshCw" size={14} className="mr-2" />
                  <span className="hidden sm:inline">Refresh Staff List</span>
                  <span className="sm:hidden">Refresh</span>
                </Button>
              </div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg sm:text-xl font-bold">Create New Task</h3>
                <button
                  onClick={() => {
                    setShowCreateTask(false);
                    setTaskError('');
                    setTaskSuccess('');
                  }}
                  className="text-gray-400 hover:text-white p-1 -mr-1"
                  aria-label="Close"
                >
                  <Icon name="X" size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Task Title *
                    </label>
                    <Input
                      type="text"
                      name="title"
                      value={taskFormData.title}
                      onChange={handleTaskInputChange}
                      required
                      className="w-full bg-gray-700 border-gray-600 text-white"
                      placeholder="Enter task title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Due Date *
                    </label>
                    <Input
                      type="datetime-local"
                      name="due_at"
                      value={taskFormData.due_at}
                      onChange={handleTaskInputChange}
                      required
                      className="w-full bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={taskFormData.description}
                    onChange={handleTaskInputChange}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task description"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Select
                      label="Priority"
                      name="priority"
                      value={taskFormData.priority}
                      onChange={(value) => {
                        const safePriority = (value || 'medium').toLowerCase();
                        setTaskFormData(prev => ({ ...prev, priority: safePriority }));
                        setTaskError('');
                        setTaskSuccess('');
                      }}
                      options={PRIORITIES}
                      placeholder="Select priority"
                      className="w-full"
                    />
                  </div>
                  <div>
                    <Select
                      label="Department"
                      name="department_id"
                      value={taskFormData.department_id}
                      onChange={(value) => {
                        setTaskFormData(prev => ({ ...prev, department_id: value || '' }));
                        setTaskError('');
                        setTaskSuccess('');
                      }}
                      options={[
                        { value: '', label: 'No Department' },
                        ...departments.map((dept) => ({
                          value: dept.id,
                          label: dept.name
                        }))
                      ]}
                      placeholder="Type to search department..."
                      searchable={true}
                      clearable={true}
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <Select
                    label="Assign to Team Members *"
                    name="assignees"
                    value={selectedAssignees}
                    onChange={(value) => {
                      setSelectedAssignees(Array.isArray(value) ? value : []);
                      setTaskError('');
                      setTaskSuccess('');
                    }}
                    options={staffMembers.map((member) => ({
                      value: member.id,
                      label: member.full_name || member.email,
                      description: member.department?.name || member.email
                    }))}
                    placeholder="Type to search and select team members..."
                    multiple={true}
                    searchable={true}
                    required={true}
                    className="w-full"
                  />
                  {selectedAssignees.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedAssignees.map((assigneeId) => {
                        const member = staffMembers.find(m => m.id === assigneeId);
                        if (!member) return null;
                        return (
                          <span
                            key={assigneeId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded text-sm"
                          >
                            {member.full_name || member.email}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAssignees(prev => prev.filter(id => id !== assigneeId));
                              }}
                              className="hover:text-blue-300"
                            >
                              <Icon name="X" size={12} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {staffMembers.length === 0 && (
                    <p className="text-gray-400 text-sm mt-2">
                      No staff members available. Create staff members first.
                    </p>
                  )}
                </div>
                {taskError && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                    <p className="text-sm text-red-400">{taskError}</p>
                  </div>
                )}
                {taskSuccess && (
                  <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                    <p className="text-sm text-green-400">{taskSuccess}</p>
                  </div>
                )}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowCreateTask(false);
                      setTaskError('');
                      setTaskSuccess('');
                    }}
                    className="bg-gray-700 hover:bg-gray-600 w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creatingTask || staffMembers.length === 0}
                    className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                  >
                    {creatingTask ? 'Creating...' : (
                      <>
                        <span className="hidden sm:inline">Create & Assign Task</span>
                        <span className="sm:hidden">Create Task</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Pending */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-300">Pending</h3>
                  <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Icon name="Clock" size={20} className="text-yellow-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
              </div>

              {/* Completed */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-300">Completed</h3>
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Icon name="CheckCircle" size={20} className="text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-400">{stats.completed}</p>
              </div>

              {/* Overdue */}
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-300">Overdue</h3>
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Icon name="AlertCircle" size={20} className="text-red-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-red-400">{stats.overdue}</p>
              </div>
            </div>
          )}

          {/* My Tasks List */}
          {myTasks.length > 0 && (
            <div className="mt-6 sm:mt-8">
              <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">My Tasks</h2>
                  <p className="text-sm sm:text-base text-gray-400">View and manage your assigned tasks</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => setTaskFilter('due')}
                    className={`flex-1 sm:flex-none ${
                      taskFilter === 'due'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    Due Tasks
                  </Button>
                  <Button
                    onClick={() => setTaskFilter('previous')}
                    className={`flex-1 sm:flex-none ${
                      taskFilter === 'previous'
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    Previous Tasks
                  </Button>
                </div>
              </div>

              {(() => {
                const now = new Date();
                const filteredTasks = myTasks.filter((item) => {
                  let status = 'pending';
                  
                  // Extract status (handle different formats)
                  if (item.status !== undefined && item.task_id) {
                    status = item.status || 'pending';
                  } else if (item.task && item.task.id) {
                    status = item.status || item.assignee_status || 'pending';
                  } else if (item.id && (item.assignee_status || item.status)) {
                    status = item.assignee_status || item.status || 'pending';
                  } else if (item.status) {
                    status = item.status;
                  }
                  
                  if (taskFilter === 'due') {
                    // Show pending or in_progress tasks (not completed)
                    return status !== 'completed';
                  } else {
                    // Show completed tasks
                    return status === 'completed';
                  }
                });

                if (filteredTasks.length === 0) {
                  return (
                    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center text-gray-400">
                      <p>
                        {taskFilter === 'due'
                          ? 'No due tasks. Great job!'
                          : 'No previous tasks yet.'}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {filteredTasks.map((item, idx) => {
                      let status = 'pending';
                      let dueDate = null;
                      let taskTitle = '';
                      let taskId = null;
                      let taskDescription = '';
                      let taskPriority = 'medium';
                      
                      // Extract task data (handle different formats)
                      if (item.status !== undefined && item.task_id) {
                        // View format (flat)
                        status = item.status || 'pending';
                        dueDate = item.due_date || item.due_at;
                        taskTitle = item.title || '';
                        taskId = item.task_id;
                        taskDescription = item.description || '';
                        taskPriority = item.priority || 'medium';
                      } else if (item.task && item.task.id) {
                        // Nested format
                        status = item.status || item.assignee_status || 'pending';
                        dueDate = item.task.due_at || item.task.due_date;
                        taskTitle = item.task.title || '';
                        taskId = item.task.id;
                        taskDescription = item.task.description || '';
                        taskPriority = item.task.priority || 'medium';
                      } else if (item.id) {
                        // Direct task format
                        status = item.assignee_status || item.status || 'pending';
                        dueDate = item.due_at || item.due_date;
                        taskTitle = item.title || '';
                        taskId = item.id;
                        taskDescription = item.description || '';
                        taskPriority = item.priority || 'medium';
                      }
                      
                      const isOverdue = dueDate && new Date(dueDate) < now && status !== 'completed';
                      const isCompleted = status === 'completed';

                      return (
                        <div
                          key={taskId || idx}
                          className="bg-gray-800 rounded-lg border border-gray-700 p-4 hover:border-gray-600 transition-colors cursor-pointer"
                          onClick={() => navigate(`/task/${taskId}`)}
                        >
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                            <div className="flex-1 w-full">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                <h3 className="text-base sm:text-lg font-semibold text-white break-words">{taskTitle}</h3>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full border ${
                                    status === 'pending'
                                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                      : status === 'in_progress'
                                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                      : 'bg-green-500/20 text-green-400 border-green-500/30'
                                  }`}
                                >
                                  {(() => {
                                    const label = {
                                      pending: 'Pending',
                                      in_progress: 'In Progress',
                                      completed: 'Completed',
                                    }[status] ?? 'Pending';
                                    return label;
                                  })()}
                                </span>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full border ${
                                    taskPriority === 'high'
                                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                      : taskPriority === 'medium'
                                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                      : 'bg-green-500/20 text-green-400 border-green-500/30'
                                  }`}
                                >
                                  {taskPriority === 'normal' ? 'medium' : taskPriority}
                                </span>
                              </div>
                              {taskDescription && (
                                <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                                  {taskDescription}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-gray-400">
                                {dueDate && (
                                  <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-400 font-medium' : ''}`}>
                                    <Icon name="Calendar" size={14} />
                                    <span>
                                      {new Date(dueDate).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                      })}
                                    </span>
                                    {isOverdue && (
                                      <span className="ml-1">
                                        <Icon name="AlertCircle" size={14} />
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            {!isCompleted && taskFilter === 'due' && (
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsDone(item);
                                }}
                                className="bg-green-600 hover:bg-green-700 w-full sm:w-auto sm:ml-4 mt-2 sm:mt-0"
                              >
                                <Icon name="CheckCircle" size={16} className="mr-2" />
                                <span className="hidden sm:inline">Mark as Done</span>
                                <span className="sm:hidden">Done</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Team Member Tasks Overview (Admin Only) */}
          {userProfile?.role === 'admin' && (
            <div className="mt-6 sm:mt-8">
              <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Team Member Tasks</h2>
                <p className="text-sm sm:text-base text-gray-400">All tasks assigned to your team members (including completed tasks)</p>
              </div>

              {loadingTeamTasks ? (
                <div className="flex justify-center items-center h-32">
                  <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : teamTasks.length === 0 ? (
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 text-center text-gray-400">
                  <p>No tasks assigned to team members yet.</p>
                  <p className="text-sm mt-2">Create tasks and assign them to team members to see them here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-gray-800 rounded-lg border border-gray-700 -mx-3 sm:mx-0">
                  <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700 hidden sm:table-header-group">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Task Title
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Assigned To
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Due Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {teamTasks.map((task) => {
                        const assignees = task.task_assignees || [];
                        const staffAssignees = assignees.filter(a => {
                          const assigneeId = a.user_id || a.user?.id;
                          return staffMembers.some(sm => sm.id === assigneeId);
                        });

                        // Show ALL assignees (including completed tasks)
                        return staffAssignees.map((assignee, idx) => {
                          const assigneeId = assignee.user_id || assignee.user?.id;
                          const member = staffMembers.find(sm => sm.id === assigneeId);
                          const dueDate = task.due_at || task.due_date;
                          const assigneeStatus = assignee.status || 'pending';
                          const isOverdue = dueDate && new Date(dueDate) < new Date() && assigneeStatus !== 'completed';

                          return (
                            <tr
                              key={`${task.id}-${assigneeId}-${idx}`}
                              className="hover:bg-gray-700 cursor-pointer transition-colors"
                              onClick={() => navigate(`/task/${task.id}`)}
                            >
                              <td className="px-4 sm:px-6 py-4">
                                <div className="text-sm font-medium text-white break-words">{task.title}</div>
                              </td>
                              <td className="px-4 sm:px-6 py-4 text-sm text-gray-300">
                                {member?.full_name || member?.email || assignee.user?.full_name || assignee.user?.email || 'Unknown'}
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    assigneeStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                    assigneeStatus === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                    assigneeStatus === 'completed' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                    'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                  }`}
                                >
                                  {(() => {
                                    const label = {
                                      pending: 'Pending',
                                      in_progress: 'In Progress',
                                      completed: 'Completed',
                                    }[assigneeStatus] ?? (assigneeStatus.replace('_', ' ') || 'Pending');
                                    return label;
                                  })()}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                <div className={`text-sm ${isOverdue ? 'text-red-400 font-medium' : 'text-gray-300'}`}>
                                  {dueDate ? new Date(dueDate).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  }) : 'No due date'}
                                  {isOverdue && (
                                    <span className="ml-2 text-red-400">
                                      <Icon name="AlertCircle" size={14} />
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;

