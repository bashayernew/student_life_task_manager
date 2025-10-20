import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/AppIcon';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const Login = () => {
  const { signIn, loading, user, userProfile, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect based on user role after authentication and profile loading
  useEffect(() => {
    if (user && !loading && !profileLoading && userProfile) {
      // Redirect based on user role
      if (userProfile?.role === 'admin') {
        navigate('/admin-dashboard');
      } else if (userProfile?.role === 'staff') {
        navigate('/staff-dashboard');
      } else {
        // Fallback for unknown roles
        navigate('/admin-dashboard');
      }
    }
  }, [user, loading, profileLoading, userProfile, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e?.target || {};
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (authError) setAuthError('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setIsLoading(true);
    setAuthError('');

    if (!formData?.email || !formData?.password) {
      setAuthError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await signIn(formData?.email, formData?.password);
      
      if (error) {
        setAuthError(error?.message || 'Sign in failed');
      }
      // Note: Redirect is handled by useEffect after profile loads
    } catch (error) {
      setAuthError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while authenticating or loading profile
  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">
            {loading ? 'Loading...' : 'Setting up your workspace...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="Shield" size={32} color="white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Task Manager</h1>
          <p className="text-muted-foreground">Sign in to manage tasks and team</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <Input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData?.email || ''}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          <div>
            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={formData?.password || ''}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full"
            />
          </div>

          {authError && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Icon name="AlertTriangle" size={16} className="text-error" />
                <p className="text-sm text-error">{authError}</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Icon name="LogIn" size={16} />
                <span>Sign In</span>
              </div>
            )}
          </Button>

          {/* Demo Credentials Section */}
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Demo Credentials</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Admin:</span>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      email: 'eyad123@eyad.com',
                      password: 'Ey@d9090'
                    });
                  }}
                  className="text-accent hover:text-accent/80 font-medium"
                >
                  eyad123@eyad.com / Ey@d9090
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Staff:</span>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      email: 'john@taskmanager.com',
                      password: 'password123'
                    });
                  }}
                  className="text-accent hover:text-accent/80 font-medium"
                >
                  john@taskmanager.com / password123
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;