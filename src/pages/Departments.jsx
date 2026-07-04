import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { departmentService } from '../utils/departmentService';
import ProtectedRoute from '../components/ProtectedRoute';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import AppPageHeader from '../components/AppPageHeader';

const Departments = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editingDeptName, setEditingDeptName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setLoading(true);
    const { data, error: loadError } = await departmentService.getDepartments();
    if (loadError) {
      setError(loadError.message || 'Failed to load departments');
    } else if (data) {
      setDepartments(data);
    }
    setLoading(false);
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    const { error: createError } = await departmentService.createDepartment(newDeptName.trim());
    if (createError) {
      setError(createError.message || 'Failed to create department');
    } else {
      setNewDeptName('');
      setSuccess('Department created successfully.');
      await loadDepartments();
    }
    setSubmitting(false);
  };

  const handleSaveDepartment = async (deptId) => {
    if (!editingDeptName.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    const { error: updateError } = await departmentService.updateDepartment(deptId, editingDeptName.trim());
    if (updateError) {
      setError(updateError.message || 'Failed to update department');
    } else {
      setEditingDeptId(null);
      setEditingDeptName('');
      setSuccess('Department updated successfully.');
      await loadDepartments();
    }
    setSubmitting(false);
  };

  const handleDeleteDepartment = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"? This only works if no staff or tasks are assigned.`)) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');
    const { error: deleteError } = await departmentService.deleteDepartment(dept.id);
    if (deleteError) {
      setError(deleteError.message || 'Failed to delete department');
    } else {
      setSuccess(`Department "${dept.name}" deleted.`);
      await loadDepartments();
    }
    setSubmitting(false);
  };

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="min-h-screen bg-background text-foreground">
        <AppPageHeader title="Departments" />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {(error || success) && (
            <div className="mb-6 space-y-3">
              {error && (
                <div className="bg-error/10 border border-error/30 rounded-lg p-3">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}
              {success && (
                <div className="bg-success/10 border border-success/30 rounded-lg p-3">
                  <p className="text-sm text-success">{success}</p>
                </div>
              )}
            </div>
          )}

          <div className="ktech-card p-6">
            <h2 className="text-xl font-bold mb-1">Manage Departments</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Create departments here, then assign them to staff on the Staff page.
            </p>

            <form onSubmit={handleAddDepartment} className="flex flex-col sm:flex-row gap-3 mb-6">
              <Input
                type="text"
                value={newDeptName}
                onChange={(e) => {
                  setNewDeptName(e.target.value);
                  setError('');
                  setSuccess('');
                }}
                placeholder="New department name"
                className="flex-1"
                disabled={submitting}
              />
              <Button type="submit" disabled={submitting || !newDeptName.trim()}>
                {submitting ? 'Saving...' : 'Add Department'}
              </Button>
            </form>

            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="ktech-spinner" />
              </div>
            ) : departments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No departments yet. Add one above.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Staff</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Tasks</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {departments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          {editingDeptId === dept.id ? (
                            <Input
                              type="text"
                              value={editingDeptName}
                              onChange={(e) => setEditingDeptName(e.target.value)}
                              className="max-w-xs"
                            />
                          ) : (
                            <span className="text-sm font-medium text-foreground">{dept.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{dept.staff_count ?? 0}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{dept.task_count ?? 0}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {editingDeptId === dept.id ? (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleSaveDepartment(dept.id)}
                                  disabled={submitting}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingDeptId(null);
                                    setEditingDeptName('');
                                  }}
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDeptId(dept.id);
                                    setEditingDeptName(dept.name);
                                  }}
                                  className="text-secondary hover:text-primary underline text-xs"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDepartment(dept)}
                                  disabled={submitting}
                                  className="text-error hover:text-red-700 underline text-xs"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Departments;
