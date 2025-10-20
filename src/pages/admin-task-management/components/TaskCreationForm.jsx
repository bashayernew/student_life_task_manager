import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { taskService } from '../../../utils/taskService';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import Select from '../../../components/ui/Select';
import Icon from '../../../components/AppIcon';

const TaskCreationForm = ({ isOpen, onClose, onTaskCreated }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    details: '',
    due_at: '',
    priority: 'normal',
    department_id: ''
  });
  const [assignees, setAssignees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load departments and staff on mount - REPLACE MOCK DATA
  useEffect(() => {
    if (isOpen) {
      loadFormData();
    }
  }, [isOpen]);

  const loadFormData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load departments from Supabase
      const { data: depts, error: deptError } = await taskService?.getDepartments();
      if (deptError) {
        setError('Failed to load departments: ' + deptError?.message);
        return;
      }

      // Load staff members from Supabase  
      const { data: staff, error: staffError } = await taskService?.getStaffMembers();
      if (staffError) {
        setError('Failed to load staff members: ' + staffError?.message);
        return;
      }

      setDepartments(depts || []);
      setStaffMembers(staff || []);
    } catch (error) {
      setError('Failed to load form data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e?.target || {};
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleAssigneeToggle = (staffId) => {
    setSelectedAssignees(prev => 
      prev?.includes(staffId) 
        ? prev?.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!formData?.title?.trim()) {
      setError('Task title is required');
      return;
    }
    
    if (!formData?.due_at) {
      setError('Due date is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create task with actual Supabase integration
      const taskData = {
        ...formData,
        created_by: user?.id,
        due_at: new Date(formData?.due_at)?.toISOString()
      };

      const { data: newTask, error: taskError } = await taskService?.createTask(taskData);
      
      if (taskError) {
        setError('Failed to create task: ' + taskError?.message);
        return;
      }

      // Assign selected staff members
      if (selectedAssignees?.length > 0) {
        const { error: assignError } = await taskService?.assignTask(
          newTask?.id, 
          selectedAssignees
        );
        
        if (assignError) {
          setError('Task created but failed to assign staff: ' + assignError?.message);
          // Still call onTaskCreated because task was created
        }
      }

      // Reset form
      setFormData({
        title: '',
        details: '',
        due_at: '',
        priority: 'normal',
        department_id: ''
      });
      setSelectedAssignees([]);
      
      onTaskCreated?.();
      onClose?.();
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground">Create New Task</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <Icon name="X" size={20} />
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-3 text-muted-foreground">Loading...</span>
            </div>
          )}

          {/* Form */}
          {!loading && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Task Title *
                </label>
                <Input
                  name="title"
                  value={formData?.title || ''}
                  onChange={handleInputChange}
                  placeholder="Enter task title"
                  disabled={loading}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  name="details"
                  value={formData?.details || ''}
                  onChange={handleInputChange}
                  placeholder="Enter task description"
                  disabled={loading}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Due Date *
                  </label>
                  <Input
                    type="datetime-local"
                    name="due_at"
                    value={formData?.due_at || ''}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Priority
                  </label>
                  <Select
                    name="priority"
                    value={formData?.priority || 'normal'}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Department
                  </label>
                  <Select
                    name="department_id"
                    value={formData?.department_id || ''}
                    onChange={handleInputChange}
                    disabled={loading}
                    className="w-full"
                  >
                    <option value="">Select Department</option>
                    {departments?.map((dept) => (
                      <option key={dept?.id} value={dept?.id}>
                        {dept?.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Staff Assignment */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Assign to Staff Members
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-border rounded-lg p-3">
                  {staffMembers?.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No staff members available</p>
                  ) : (
                    staffMembers?.map((staff) => (
                      <label key={staff?.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAssignees?.includes(staff?.id)}
                          onChange={() => handleAssigneeToggle(staff?.id)}
                          disabled={loading}
                          className="w-4 h-4 text-accent bg-background border-border rounded focus:ring-accent focus:ring-2"
                        />
                        <span className="text-sm text-foreground">{staff?.full_name}</span>
                        <span className="text-xs text-muted-foreground">({staff?.email})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-error/10 border border-error/20 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Icon name="AlertTriangle" size={16} className="text-error" />
                    <p className="text-sm text-error">{error}</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !formData?.title?.trim() || !formData?.due_at}
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Icon name="Plus" size={16} />
                      <span>Create Task</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCreationForm;