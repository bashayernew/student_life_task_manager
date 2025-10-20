import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { taskService } from '../../utils/taskService';
import Header from '../../components/ui/Header';
import TaskCreationForm from './components/TaskCreationForm';
import StatusDashboard from './components/StatusDashboard';
import TaskOverviewTable from './components/TaskOverviewTable';
import StaffManagement from './components/StaffManagement';
import Icon from '../../components/AppIcon';

const AdminTaskManagement = () => {
  const { user, userProfile } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');

  // Load tasks from Supabase
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await taskService?.getTasks();
      if (!error) {
        setTasks(data || []);
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new task creation
  const handleTaskCreate = (newTask) => {
    setTasks(prevTasks => [newTask, ...prevTasks]);
    loadTasks(); // Reload to get complete data with relationships
  };

  // Handle task updates
  const handleTaskUpdate = (taskId, updates) => {
    setTasks(prevTasks =>
      prevTasks?.map(task =>
        task?.id === taskId ? { ...task, ...updates } : task
      )
    );
    loadTasks(); // Reload to get updated data
  };

  // Handle task deletion
  const handleTaskDelete = (taskId) => {
    setTasks(prevTasks => prevTasks?.filter(task => task?.id !== taskId));
  };

  // Handle department filter changes
  const handleDepartmentChange = (departments) => {
    setSelectedDepartments(departments);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-16">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h2 className="text-xl font-semibold text-foreground">Loading Admin Dashboard</h2>
                <p className="text-muted-foreground">Fetching task data and initializing interface...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Settings" size={24} color="white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                  Welcome {userProfile?.full_name} - Manage tasks and team members
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Icon name="CheckSquare" size={16} className="text-accent" />
                  <span className="text-sm text-muted-foreground">Total Tasks</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">{tasks?.length}</p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Icon name="Clock" size={16} className="text-warning" />
                  <span className="text-sm text-muted-foreground">Pending</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {tasks?.filter(task => {
                    const pendingAssignees = task?.task_assignees?.some(assignee => assignee?.status === 'pending');
                    return pendingAssignees;
                  })?.length}
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Icon name="AlertTriangle" size={16} className="text-error" />
                  <span className="text-sm text-muted-foreground">Overdue</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {tasks?.filter(task => {
                    const dueDate = new Date(task?.due_at);
                    const now = new Date();
                    const hasIncompleteAssignees = task?.task_assignees?.some(assignee => assignee?.status !== 'completed');
                    return dueDate < now && hasIncompleteAssignees;
                  })?.length}
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Icon name="CheckCircle" size={16} className="text-success" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {tasks?.filter(task => {
                    const allCompleted = task?.task_assignees?.length > 0 && 
                      task?.task_assignees?.every(assignee => assignee?.status === 'completed');
                    return allCompleted;
                  })?.length}
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-border">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'tasks' ?'border-accent text-accent' :'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon name="CheckSquare" size={16} />
                    <span>Task Management</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('staff')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'staff' ?'border-accent text-accent' :'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon name="Users" size={16} />
                    <span>Staff Management</span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'tasks' ? (
            <>
              {/* Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Task Creation Form - Takes 2 columns on xl screens */}
                <div className="xl:col-span-2">
                  <TaskCreationForm onTaskCreate={handleTaskCreate} />
                </div>

                {/* Status Dashboard - Takes 1 column on xl screens */}
                <div className="xl:col-span-1">
                  <StatusDashboard
                    tasks={tasks}
                    selectedDepartments={selectedDepartments}
                    onDepartmentChange={handleDepartmentChange}
                  />
                </div>
              </div>

              {/* Task Overview Table - Full width */}
              <div className="mt-8">
                <TaskOverviewTable
                  tasks={tasks}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskDelete={handleTaskDelete}
                />
              </div>
            </>
          ) : (
            /* Staff Management Tab */
            <div>
              <StaffManagement />
            </div>
          )}

          {/* Footer Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0 p-6 bg-muted/30 border border-border rounded-lg">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Icon name="Info" size={16} />
              <span>
                Tasks and staff members are automatically synced in real-time
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-micro">
                <Icon name="Download" size={16} />
                <span>Export Data</span>
              </button>
              
              <button className="flex items-center space-x-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-micro">
                <Icon name="Settings" size={16} />
                <span>Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTaskManagement;