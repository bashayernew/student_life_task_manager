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
import AppPageHeader from '../components/AppPageHeader';
import { getStatusBadgeClass, getTaskDisplayStatusForUser } from '../utils/statusUtils';

const Dashboard = () => {
  const { userProfile, user, loading: authLoading, profileLoading } = useAuth();
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
  const [assigneePersonalNotes, setAssigneePersonalNotes] = useState({});
  const [completionComments, setCompletionComments] = useState({});
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskError, setTaskError] = useState('');
  const [taskSuccess, setTaskSuccess] = useState('');

  const isAdmin = userProfile?.role === 'admin';
  const isManager = userProfile?.role === 'manager';
  const managerDepartmentIds = isManager
    ? (userProfile?.department_ids?.length
        ? userProfile.department_ids
        : userProfile?.department_id
          ? [userProfile.department_id]
          : [])
    : [];
  const hasManagerDepartments = managerDepartmentIds.length > 0;
  const canCreateTasks = isAdmin || (isManager && hasManagerDepartments);
  const canViewTeamTasks = isAdmin || (isManager && hasManagerDepartments);

  useEffect(() => {
    // Wait for auth and profile to load before fetching data
    if (!authLoading && !profileLoading && userProfile?.id) {
      loadStats();
      if (canCreateTasks) {
        loadDepartments();
        loadStaffMembers();
      }
    }
  }, [authLoading, profileLoading, userProfile?.id, userProfile?.role, userProfile?.department_id, userProfile?.department_ids]);

  // Reload staff members when showing create task form
  useEffect(() => {
    if (showCreateTask && canCreateTasks) {
      loadStaffMembers();
      if (isManager && hasManagerDepartments) {
        setTaskFormData((prev) => ({
          ...prev,
          department_id: managerDepartmentIds.length === 1 ? managerDepartmentIds[0] : prev.department_id,
        }));
      }
    }
  }, [showCreateTask, canCreateTasks, isManager, managerDepartmentIds]);

  // Auto-refresh stats every 10 seconds for admins/managers to see live updates
  useEffect(() => {
    if (canViewTeamTasks && userProfile?.id && !authLoading && !profileLoading) {
      const interval = setInterval(() => {
        loadStats();
        if (staffMembers.length > 0) {
          loadTeamMemberTasks(staffMembers);
        }
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [canViewTeamTasks, userProfile?.id, authLoading, profileLoading, staffMembers.length]);

  const loadDepartments = async () => {
    const { data } = await taskService.getDepartments();
    if (data) setDepartments(data);
  };

  const loadStaffMembers = async () => {
    const role = userProfile?.role;

    if (role === 'admin') {
      const { data } = await staffService.getStaff();
      if (data) {
        const staff = data.filter((member) => member.role === 'staff');
        setStaffMembers(staff);
        loadTeamMemberTasks(staff);
      }
      return;
    }

    if (role === 'manager' && hasManagerDepartments) {
      const { data, error } = await taskService.getStaffMembers();
      if (error) {
        console.error('Failed to load assignable staff:', error);
        setStaffMembers([]);
        return;
      }

      setStaffMembers(data || []);
      loadTeamMemberTasks(data || []);

      setSelectedAssignees((prev) =>
        prev.filter((assigneeId) => (data || []).some((member) => member.id === assigneeId))
      );
    }
  };

  const loadTeamMemberTasks = async (staffList = staffMembers) => {
    if (!canViewTeamTasks) return;
    
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
        userId: user.id, 
        taskId: taskId, 
        status: STATUS.COMPLETED,
        comment: completionComments[taskId] || '',
      });
      
      setCompletionComments((prev) => {
        const next = { ...prev };
        delete next[taskId];
        return next;
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

    if (isManager && managerDepartmentIds.length > 1 && !taskFormData.department_id) {
      setTaskError('Please select which department this task belongs to');
      return;
    }

    setCreatingTask(true);

    try {
      // Create task with assignees in one call (createTask now handles both)
      const taskData = {
        title: taskFormData.title,
        details: taskFormData.description || '',
        due_at: taskFormData.due_at,
        priority: taskFormData.priority,
        department_id: isManager
          ? (managerDepartmentIds.length === 1
              ? managerDepartmentIds[0]
              : taskFormData.department_id || null)
          : taskFormData.department_id || null,
        created_by: user?.id,
        assigneeIds: selectedAssignees,
        assigneeDetails: selectedAssignees.map((assigneeId) => ({
          userId: assigneeId,
          personalDescription: assigneePersonalNotes[assigneeId] || '',
        })),
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
      setAssigneePersonalNotes({});
      setTaskSuccess('Task created and assigned successfully!');
      setShowCreateTask(false);
      
      // Reload stats after a moment
      setTimeout(() => {
        loadStats();
        if (canViewTeamTasks) {
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
      <div className="ktech-page-shell">
        <AppPageHeader
          title="Task Manager"
          subtitle={`Welcome, ${userProfile?.full_name || userProfile?.email}`}
        />

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-4 sm:py-6 lg:py-8">
          {isManager && !hasManagerDepartments && (
            <div className="mb-6 bg-warning/10 border border-warning/30 rounded-lg p-4">
              <p className="text-sm text-warning">
                Your manager account has no department assigned yet. Ask an admin to assign you at least one department before you can assign tasks to staff.
              </p>
            </div>
          )}

          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
                {canViewTeamTasks ? 'All Tasks by Status' : 'My Tasks by Status'}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isAdmin
                  ? 'Overview of all tasks (including team member tasks)'
                  : isManager
                    ? 'Overview of tasks in your department'
                    : 'Overview of your assigned tasks'}
              </p>
            </div>
            {canCreateTasks && (
              <Button
                onClick={() => setShowCreateTask(true)}
                className="w-full sm:w-auto"
              >
                <Icon name="Plus" size={16} className="mr-2" />
                Create Task
              </Button>
            )}
          </div>

          {/* Create Task Modal/Form */}
          {showCreateTask && canCreateTasks && (
            <div className="mb-6 sm:mb-8 ktech-card p-4 sm:p-6">
              {/* Refresh button to reload staff members */}
              <div className="mb-4 flex justify-end">
                <Button
                  type="button"
                  onClick={async () => {
                    await loadStaffMembers();
                    setTaskSuccess('Staff list refreshed');
                    setTimeout(() => setTaskSuccess(''), 2000);
                  }}
                  className="bg-muted hover:bg-muted/80 text-xs sm:text-sm w-full sm:w-auto"
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
                  className="text-muted-foreground hover:text-foreground p-1 -mr-1"
                  aria-label="Close"
                >
                  <Icon name="X" size={20} />
                </button>
              </div>
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Task Title *
                    </label>
                    <Input
                      type="text"
                      name="title"
                      value={taskFormData.title}
                      onChange={handleTaskInputChange}
                      required
                      className="w-full bg-background border-border text-foreground"
                      placeholder="Enter task title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      Due Date *
                    </label>
                    <Input
                      type="datetime-local"
                      name="due_at"
                      value={taskFormData.due_at}
                      onChange={handleTaskInputChange}
                      required
                      className="w-full bg-background border-border text-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    General Description
                  </label>
                  <textarea
                    name="description"
                    value={taskFormData.description}
                    onChange={handleTaskInputChange}
                    rows={3}
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Shared instructions for everyone assigned to this task"
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
                    {isManager ? (
                      managerDepartmentIds.length === 1 ? (
                        <div>
                          <label className="block text-sm font-medium text-muted-foreground mb-2">
                            Department
                          </label>
                          <div className="h-10 flex items-center px-3 rounded-md border border-border bg-muted text-sm text-foreground">
                            {userProfile?.departments?.find((dept) => dept.id === managerDepartmentIds[0])?.name ||
                              departments.find((dept) => dept.id === managerDepartmentIds[0])?.name ||
                              'Your department'}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Tasks you create are limited to your assigned department.
                          </p>
                        </div>
                      ) : (
                        <Select
                          label="Department *"
                          name="department_id"
                          value={taskFormData.department_id}
                          onChange={(value) => {
                            setTaskFormData((prev) => ({ ...prev, department_id: value || '' }));
                            setTaskError('');
                            setTaskSuccess('');
                          }}
                          options={managerDepartmentIds.map((deptId) => {
                            const dept =
                              userProfile?.departments?.find((item) => item.id === deptId) ||
                              departments.find((item) => item.id === deptId);
                            return {
                              value: deptId,
                              label: dept?.name || 'Department',
                            };
                          })}
                          placeholder="Select department for this task"
                          searchable
                          className="w-full"
                        />
                      )
                    ) : (
                      <Select
                        label="Department"
                        name="department_id"
                        value={taskFormData.department_id}
                        onChange={(value) => {
                          setTaskFormData((prev) => ({ ...prev, department_id: value || '' }));
                          setTaskError('');
                          setTaskSuccess('');
                        }}
                        options={[
                          { value: '', label: 'No Department' },
                          ...departments.map((dept) => ({
                            value: dept.id,
                            label: dept.name,
                          })),
                        ]}
                        placeholder="Type to search department..."
                        searchable={true}
                        clearable={true}
                        className="w-full"
                      />
                    )}
                  </div>
                </div>
                <div>
                  <Select
                    label="Assign to Team Members *"
                    name="assignees"
                    value={selectedAssignees}
                    onChange={(value) => {
                      const nextAssignees = Array.isArray(value) ? value : [];
                      setSelectedAssignees(nextAssignees);
                      setAssigneePersonalNotes((prev) => {
                        const next = {};
                        for (const assigneeId of nextAssignees) {
                          next[assigneeId] = prev[assigneeId] || '';
                        }
                        return next;
                      });
                      setTaskError('');
                      setTaskSuccess('');
                    }}
                    options={staffMembers.map((member) => ({
                      value: member.id,
                      label: member.full_name || member.email,
                      description:
                        member.departments?.map((dept) => dept.name).join(', ') ||
                        member.department?.name ||
                        member.email,
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
                            className="inline-flex items-center gap-1 px-2 py-1 bg-accent/15 text-secondary border border-accent/30 rounded text-sm"
                          >
                            {member.full_name || member.email}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAssignees(prev => prev.filter(id => id !== assigneeId));
                              }}
                              className="hover:text-primary"
                            >
                              <Icon name="X" size={12} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {selectedAssignees.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <h4 className="text-sm font-semibold text-foreground">
                        Personal instructions (optional)
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Add extra details for specific team members. They will only see their own note.
                      </p>
                      {selectedAssignees.map((assigneeId) => {
                        const member = staffMembers.find((m) => m.id === assigneeId);
                        if (!member) return null;
                        return (
                          <div key={assigneeId}>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">
                              {member.full_name || member.email}
                            </label>
                            <textarea
                              value={assigneePersonalNotes[assigneeId] || ''}
                              onChange={(e) => {
                                setAssigneePersonalNotes((prev) => ({
                                  ...prev,
                                  [assigneeId]: e.target.value,
                                }));
                              }}
                              rows={2}
                              className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                              placeholder={`Personal description for ${member.full_name || member.email}`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {staffMembers.length === 0 && (
                    <p className="text-muted-foreground text-sm mt-2">
                      {isManager
                        ? 'No staff members in your department yet. Ask an admin to add staff to your department.'
                        : 'No staff members available. Create staff members first.'}
                    </p>
                  )}
                </div>
                {taskError && (
                  <div className="bg-error/15 border border-error/30 rounded-lg p-3">
                    <p className="text-sm text-error">{taskError}</p>
                  </div>
                )}
                {taskSuccess && (
                  <div className="bg-success/15 border border-success/30 rounded-lg p-3">
                    <p className="text-sm text-success">{taskSuccess}</p>
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
                    className="bg-muted hover:bg-muted/80 w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creatingTask || staffMembers.length === 0}
                    className="w-full sm:w-auto"
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
              <div className="ktech-spinner"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Pending */}
              <div className="ktech-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-muted-foreground">Pending</h3>
                  <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center">
                    <Icon name="Clock" size={20} className="text-warning" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-warning">{stats.pending}</p>
              </div>

              {/* Completed */}
              <div className="ktech-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-muted-foreground">Completed</h3>
                  <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
                    <Icon name="CheckCircle" size={20} className="text-success" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-success">{stats.completed}</p>
              </div>

              {/* Overdue */}
              <div className="ktech-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-muted-foreground">Overdue</h3>
                  <div className="w-10 h-10 rounded-full bg-error/15 flex items-center justify-center">
                    <Icon name="AlertCircle" size={20} className="text-error" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-error">{stats.overdue}</p>
              </div>
            </div>
          )}

          {/* My Tasks List */}
          {myTasks.length > 0 && (
            <div className="mt-6 sm:mt-8">
              <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">My Tasks</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">View and manage your assigned tasks</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    onClick={() => setTaskFilter('due')}
                    variant={taskFilter === 'due' ? 'default' : 'outline'}
                    className="flex-1 sm:flex-none"
                  >
                    Due Tasks
                  </Button>
                  <Button
                    onClick={() => setTaskFilter('previous')}
                    variant={taskFilter === 'previous' ? 'default' : 'outline'}
                    className="flex-1 sm:flex-none"
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
                    <div className="ktech-card p-6 text-center text-muted-foreground">
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
                          className="ktech-card p-4 hover:border-border transition-colors cursor-pointer"
                          onClick={() => navigate(`/task/${taskId}`)}
                        >
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                            <div className="flex-1 w-full">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                <h3 className="text-base sm:text-lg font-semibold text-foreground break-words">{taskTitle}</h3>
                                <span
                                  className={`px-2 py-1 text-xs font-medium rounded-full border ${
                                    status === 'pending'
                                      ? 'bg-warning/15 text-warning border-yellow-500/30'
                                      : status === 'in_progress'
                                      ? 'bg-accent/15 text-secondary border border-accent/30'
                                      : 'bg-success/15 text-success border-success/30'
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
                                      ? 'bg-error/15 text-error border-error/30'
                                      : taskPriority === 'medium'
                                      ? 'bg-warning/15 text-warning border-yellow-500/30'
                                      : 'bg-success/15 text-success border-success/30'
                                  }`}
                                >
                                  {taskPriority === 'normal' ? 'medium' : taskPriority}
                                </span>
                              </div>
                              {taskDescription && (
                                <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                                  {taskDescription}
                                </p>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                {dueDate && (
                                  <div className={`flex items-center gap-1 ${isOverdue ? 'text-error font-medium' : ''}`}>
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
                              <div
                                className="w-full sm:w-auto sm:ml-4 mt-2 sm:mt-0 space-y-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <textarea
                                  value={completionComments[taskId] || ''}
                                  onChange={(e) => {
                                    setCompletionComments((prev) => ({
                                      ...prev,
                                      [taskId]: e.target.value,
                                    }));
                                  }}
                                  rows={2}
                                  placeholder="Add a comment when completing (optional)"
                                  className="w-full sm:min-w-[220px] bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsDone(item);
                                  }}
                                  className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
                                >
                                  <Icon name="CheckCircle" size={16} className="mr-2" />
                                  <span className="hidden sm:inline">Mark as Done</span>
                                  <span className="sm:hidden">Done</span>
                                </Button>
                              </div>
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

          {/* Team Member Tasks Overview (Admin/Manager) */}
          {canViewTeamTasks && (
            <div className="mt-6 sm:mt-8">
              <div className="mb-4">
                <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Team Member Tasks</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {isManager
                    ? 'Tasks assigned to staff in your department (including completed tasks)'
                    : 'All tasks assigned to your team members (including completed tasks)'}
                </p>
              </div>

              {loadingTeamTasks ? (
                <div className="flex justify-center items-center h-32">
                  <div className="ktech-spinner w-8 h-8"></div>
                </div>
              ) : teamTasks.length === 0 ? (
                <div className="ktech-card p-6 text-center text-muted-foreground">
                  <p>No tasks assigned to team members yet.</p>
                  <p className="text-sm mt-2">Create tasks and assign them to team members to see them here.</p>
                </div>
              ) : (
                <div className="ktech-card overflow-hidden">
                  <div className="ktech-mobile-card-list">
                    {teamTasks.map((task) => {
                      const assignees = task.task_assignees || [];
                      const staffAssignees = assignees.filter((a) => {
                        const assigneeId = a.user_id || a.user?.id;
                        return staffMembers.some((sm) => sm.id === assigneeId);
                      });
                      const displayStatus = getTaskDisplayStatusForUser(task, userProfile);
                      const dueDate = task.due_at || task.due_date;
                      const assigneeStatus = displayStatus.badgeStatus;
                      const isTaskOverdue = dueDate && new Date(dueDate) < new Date() && assigneeStatus !== 'completed';
                      const assigneeNames = staffAssignees
                        .map((a) => {
                          const assigneeId = a.user_id || a.user?.id;
                          const member = staffMembers.find((sm) => sm.id === assigneeId);
                          return member?.full_name || member?.email || a.user?.full_name || a.user?.email || 'Unknown';
                        })
                        .join(', ');

                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => navigate(`/task/${task.id}`)}
                          className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
                        >
                          <p className="text-sm font-semibold text-foreground break-words">{task.title}</p>
                          <p className="mt-2 text-xs text-muted-foreground break-words">
                            {assigneeNames || 'No assignees'}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClass(displayStatus.badgeStatus)}`}
                            >
                              {displayStatus.label}
                            </span>
                            {displayStatus.summary?.total > 1 ? (
                              <span className="text-xs text-muted-foreground">
                                {displayStatus.summary.completed}/{displayStatus.summary.total} done
                              </span>
                            ) : null}
                          </div>
                          <p className={`mt-2 text-xs ${isTaskOverdue ? 'text-error font-medium' : 'text-muted-foreground'}`}>
                            Due {dueDate ? new Date(dueDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            }) : 'No due date'}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="ktech-responsive-table-wrap">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted hidden sm:table-header-group">
                      <tr>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Task Title
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Assignees
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Overall Status
                        </th>
                        <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Due Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {teamTasks.map((task) => {
                        const assignees = task.task_assignees || [];
                        const staffAssignees = assignees.filter((a) => {
                          const assigneeId = a.user_id || a.user?.id;
                          return staffMembers.some((sm) => sm.id === assigneeId);
                        });
                        const displayStatus = getTaskDisplayStatusForUser(task, userProfile);
                        const dueDate = task.due_at || task.due_date;
                        const assigneeStatus = displayStatus.badgeStatus;
                        const isTaskOverdue = dueDate && new Date(dueDate) < new Date() && assigneeStatus !== 'completed';
                        const assigneeNames = staffAssignees
                          .map((a) => {
                            const assigneeId = a.user_id || a.user?.id;
                            const member = staffMembers.find((sm) => sm.id === assigneeId);
                            const name = member?.full_name || member?.email || a.user?.full_name || a.user?.email || 'Unknown';
                            const status = (a.status || 'pending').replace('_', ' ');
                            return `${name} (${status})`;
                          })
                          .join(', ');

                        return (
                          <tr
                            key={task.id}
                            className="hover:bg-muted cursor-pointer transition-colors"
                            onClick={() => navigate(`/task/${task.id}`)}
                          >
                            <td className="px-4 sm:px-6 py-4">
                              <div className="text-sm font-medium text-foreground break-words">{task.title}</div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-sm text-muted-foreground break-words">
                              {assigneeNames || 'No assignees'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadgeClass(displayStatus.badgeStatus)}`}
                                >
                                  {displayStatus.label}
                                </span>
                                {displayStatus.summary?.total > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    {displayStatus.summary.completed}/{displayStatus.summary.total} members completed
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${isTaskOverdue ? 'text-error font-medium' : 'text-muted-foreground'}`}>
                                {dueDate ? new Date(dueDate).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                }) : 'No due date'}
                                {isTaskOverdue && (
                                  <span className="ml-2 text-error">
                                    <Icon name="AlertCircle" size={14} />
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
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

