import React, { useState, useEffect } from 'react';
import { authService } from '../../../utils/authService';
import { taskService } from '../../../utils/taskService';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';

const StaffManagement = () => {
  const [staffMembers, setStaffMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userTasks, setUserTasks] = useState([]);
  const [showUserTasks, setShowUserTasks] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'staff'
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadStaffMembers();
  }, []);

  const loadStaffMembers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await authService?.getStaffMembers();
      
      if (error) {
        setError(error?.message || 'Failed to load staff members');
      } else {
        setStaffMembers(data || []);
      }
    } catch (error) {
      setError('Failed to load staff members');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserTasks = async (userId, userName) => {
    setIsLoadingTasks(true);
    setSelectedUser({ id: userId, name: userName });
    setShowUserTasks(true);
    setError('');

    try {
      const { data, error } = await taskService?.getMyTasks(userId);
      
      if (error) {
        setError(error?.message || 'Failed to load user tasks');
        setUserTasks([]);
      } else {
        setUserTasks(data || []);
      }
    } catch (error) {
      setError('Failed to load user tasks');
      setUserTasks([]);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e?.target || {};
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateStaff = async (e) => {
    e?.preventDefault();
    setIsCreating(true);
    setError('');

    if (!formData?.email || !formData?.password || !formData?.fullName) {
      setError('Please fill in all required fields');
      setIsCreating(false);
      return;
    }

    try {
      const { data, error } = await authService?.createStaffMember(
        formData?.email,
        formData?.password,
        formData?.fullName,
        formData?.role
      );

      if (error) {
        setError(error?.message || 'Failed to create staff member');
      } else {
        // Reset form and reload staff list
        setFormData({
          email: '',
          password: '',
          fullName: '',
          role: 'staff'
        });
        setShowCreateForm(false);
        loadStaffMembers();
      }
    } catch (error) {
      setError('Failed to create staff member');
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const { error } = await authService?.updateStaffRole(userId, newRole);
      
      if (error) {
        setError(error?.message || 'Failed to update role');
      } else {
        loadStaffMembers();
      }
    } catch (error) {
      setError('Failed to update role');
    }
  };

  const handleDeleteStaff = async (userId, userName) => {
    if (!confirm(`Are you sure you want to delete ${userName}? This will also remove all their task assignments. This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await authService?.deleteStaffMember(userId);
      
      if (error) {
        setError(error?.message || 'Failed to delete staff member');
      } else {
        loadStaffMembers();
        // Close user tasks view if it was the deleted user
        if (selectedUser?.id === userId) {
          setShowUserTasks(false);
          setSelectedUser(null);
          setUserTasks([]);
        }
      }
    } catch (error) {
      setError('Failed to delete staff member');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'text-error bg-error/10 border-error/20';
      case 'manager':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'staff':
        return 'text-accent bg-accent/10 border-accent/20';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-success bg-success/10 border-success/20';
      case 'pending':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'in_progress':
        return 'text-accent bg-accent/10 border-accent/20';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-error bg-error/10 border-error/20';
      case 'normal':
        return 'text-accent bg-accent/10 border-accent/20';
      case 'low':
        return 'text-muted-foreground bg-muted/10 border-muted/20';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString)?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-muted-foreground">Loading staff members...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Staff Management Card */}
      <div className="bg-card border border-border rounded-lg">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">User Management</h2>
              <p className="text-sm text-muted-foreground">Manage users, delete accounts, and view their task assignments</p>
            </div>
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center space-x-2"
            >
              <Icon name="Plus" size={16} />
              <span>Add Staff Member</span>
            </Button>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 bg-error/10 border border-error/20 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <Icon name="AlertTriangle" size={16} className="text-error" />
                <p className="text-sm text-error">{error}</p>
              </div>
            </div>
          )}

          {/* Create Staff Form */}
          {showCreateForm && (
            <div className="mb-6 bg-muted/30 border border-border rounded-lg p-4">
              <h3 className="text-lg font-medium text-foreground mb-4">Add New Staff Member</h3>
              <form onSubmit={handleCreateStaff} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Full Name *
                    </label>
                    <Input
                      name="fullName"
                      placeholder="Enter full name"
                      value={formData?.fullName || ''}
                      onChange={handleInputChange}
                      disabled={isCreating}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      name="email"
                      placeholder="Enter email address"
                      value={formData?.email || ''}
                      onChange={handleInputChange}
                      disabled={isCreating}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Password *
                    </label>
                    <Input
                      type="password"
                      name="password"
                      placeholder="Enter password"
                      value={formData?.password || ''}
                      onChange={handleInputChange}
                      disabled={isCreating}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Role
                    </label>
                    <Select
                      name="role"
                      value={formData?.role || 'staff'}
                      onChange={handleInputChange}
                      disabled={isCreating}
                    >
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Creating...</span>
                      </div>
                    ) : (
                      'Create Staff Member'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Staff List */}
          {staffMembers?.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="Users" size={48} className="text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Staff Members</h3>
              <p className="text-muted-foreground">Add your first staff member to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staffMembers?.map((staff) => (
                <div
                  key={staff?.id}
                  className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                      <Icon name="User" size={20} color="white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{staff?.full_name}</h4>
                      <p className="text-sm text-muted-foreground">{staff?.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(staff?.created_at)?.toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getRoleColor(staff?.role)}`}>
                      {staff?.role?.toUpperCase()}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadUserTasks(staff?.id, staff?.full_name)}
                      className="flex items-center space-x-1 text-accent hover:bg-accent/10"
                    >
                      <Icon name="Eye" size={14} />
                      <span>View Tasks</span>
                    </Button>

                    <Select
                      value={staff?.role}
                      onChange={(e) => handleUpdateRole(staff?.id, e?.target?.value)}
                      className="text-sm"
                    >
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </Select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteStaff(staff?.id, staff?.full_name)}
                      className="text-error hover:bg-error/10"
                    >
                      <Icon name="Trash2" size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* User Tasks Modal/Panel */}
      {showUserTasks && (
        <div className="bg-card border border-border rounded-lg">
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Tasks for {selectedUser?.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  View all assigned tasks and their completion status
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowUserTasks(false);
                  setSelectedUser(null);
                  setUserTasks([]);
                }}
              >
                <Icon name="X" size={16} />
              </Button>
            </div>
          </div>

          <div className="p-6">
            {isLoadingTasks ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-muted-foreground">Loading user tasks...</p>
                </div>
              </div>
            ) : userTasks?.length === 0 ? (
              <div className="text-center py-12">
                <Icon name="CheckSquare" size={48} className="text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">No Tasks Assigned</h4>
                <p className="text-muted-foreground">This user has no tasks assigned yet.</p>
              </div>
            ) : (
              <>
                {/* Task Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-muted/30 border border-border rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Icon name="CheckSquare" size={14} className="text-accent" />
                      <span className="text-xs text-muted-foreground">Total</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">{userTasks?.length}</p>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Icon name="Clock" size={14} className="text-warning" />
                      <span className="text-xs text-muted-foreground">Pending</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {userTasks?.filter(task => task?.status === 'pending')?.length}
                    </p>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Icon name="CheckCircle" size={14} className="text-success" />
                      <span className="text-xs text-muted-foreground">Completed</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {userTasks?.filter(task => task?.status === 'completed')?.length}
                    </p>
                  </div>

                  <div className="bg-muted/30 border border-border rounded-lg p-3">
                    <div className="flex items-center space-x-2">
                      <Icon name="AlertTriangle" size={14} className="text-error" />
                      <span className="text-xs text-muted-foreground">Overdue</span>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {userTasks?.filter(task => {
                        const dueDate = new Date(task?.task?.due_at);
                        const now = new Date();
                        return dueDate < now && task?.status !== 'completed';
                      })?.length}
                    </p>
                  </div>
                </div>

                {/* Task List */}
                <div className="space-y-3">
                  {userTasks?.map((taskAssignment) => {
                    const task = taskAssignment?.task;
                    const isOverdue = new Date(task?.due_at) < new Date() && taskAssignment?.status !== 'completed';
                    
                    return (
                      <div
                        key={`${task?.id}-${selectedUser?.id}`}
                        className={`p-4 border rounded-lg transition-colors ${
                          isOverdue ? 'bg-error/5 border-error/20' : 'bg-muted/30 border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h5 className="font-medium text-foreground">{task?.title}</h5>
                              <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(task?.priority)}`}>
                                {task?.priority?.toUpperCase()}
                              </span>
                              {isOverdue && (
                                <span className="px-2 py-1 text-xs font-medium rounded bg-error/10 border-error/20 text-error">
                                  OVERDUE
                                </span>
                              )}
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3">{task?.details}</p>
                            
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center space-x-1">
                                <Icon name="Calendar" size={12} />
                                <span>Due: {formatDate(task?.due_at)}</span>
                              </div>
                              
                              {task?.department?.name && (
                                <div className="flex items-center space-x-1">
                                  <Icon name="Building" size={12} />
                                  <span>{task?.department?.name}</span>
                                </div>
                              )}
                              
                              {task?.created_by?.full_name && (
                                <div className="flex items-center space-x-1">
                                  <Icon name="User" size={12} />
                                  <span>By: {task?.created_by?.full_name}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end space-y-2">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(taskAssignment?.status)}`}>
                              {taskAssignment?.status?.toUpperCase()}
                            </span>
                            
                            <span className="text-xs text-muted-foreground">
                              Updated: {formatDate(taskAssignment?.updated_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;