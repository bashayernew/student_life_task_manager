import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../utils/authService';
import ProtectedRoute from '../components/ProtectedRoute';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Icon from '../components/AppIcon';
import KTechBrand from '../components/KTechBrand';

const Account = () => {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    const { error: changeError } = await authService.changePassword({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword,
    });

    if (changeError) {
      setError(changeError.message || 'Failed to change password.');
      setSubmitting(false);
      return;
    }

    setSuccess('Password updated successfully.');
    setFormData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setSubmitting(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background text-foreground">
        <header className="ktech-page-header">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <KTechBrand title="Account" onDark titleClassName="text-primary-foreground" />
              <div className="flex items-center gap-4">
                <Button onClick={() => navigate('/dashboard')} className="ktech-header-btn">
                  Dashboard
                </Button>
                <Button onClick={() => navigate('/tasks')} className="ktech-header-btn">
                  Tasks
                </Button>
                <Button onClick={handleLogout} className="ktech-header-btn">
                  <Icon name="LogOut" size={16} className="mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {(userProfile?.role === 'manager' || userProfile?.role === 'staff') && (
            <div className="ktech-card p-6">
              <h2 className="text-xl font-bold mb-1">Your Departments</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {userProfile?.role === 'manager'
                  ? 'Departments you manage on this platform.'
                  : 'Departments you belong to on this platform.'}
              </p>
              {userProfile?.departments?.length ? (
                <ul className="space-y-2">
                  {userProfile.departments.map((dept) => (
                    <li
                      key={dept.id}
                      className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground"
                    >
                      {dept.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No departments assigned yet. Contact an admin if this looks wrong.
                </p>
              )}
            </div>
          )}

          <div className="ktech-card p-6">
            <h2 className="text-xl font-bold mb-1">Change Password</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Signed in as {userProfile?.full_name || userProfile?.email}. Enter your current password first, then choose a new one.
            </p>

            {error && (
              <div className="mb-4 bg-error/10 border border-error/30 rounded-lg p-3">
                <p className="text-sm text-error">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 bg-success/10 border border-success/30 rounded-lg p-3">
                <p className="text-sm text-success">{success}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Current Password *
                </label>
                <Input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  New Password *
                </label>
                <Input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter a new password (min 6 characters)"
                  autoComplete="new-password"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Confirm New Password *
                </label>
                <Input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default Account;
