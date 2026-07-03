import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/AppIcon';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import KTechLogo from '../components/KTechLogo';

const Login = () => {
  const { signIn, loading, user, userProfile, profileLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user && !loading && !profileLoading && userProfile) {
      navigate('/dashboard');
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
    } catch (error) {
      setAuthError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="ktech-spinner mx-auto" />
          <p className="text-muted-foreground">
            {loading ? 'Loading...' : 'Setting up your workspace...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="ktech-card p-8 space-y-8">
          <div className="text-center">
            <KTechLogo size="login" className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground">Task Manager</h1>
            <p className="text-muted-foreground mt-1">Kuwait Technical College</p>
            <p className="text-sm text-muted-foreground">Sign in to manage tasks and team</p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <Input
              type="email"
              name="email"
              placeholder="Email address"
              value={formData?.email || ''}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full"
            />

            <Input
              type="password"
              name="password"
              placeholder="Password"
              value={formData?.password || ''}
              onChange={handleInputChange}
              disabled={isLoading}
              className="w-full"
            />

            {authError && (
              <div className="bg-error/10 border border-error/20 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Icon name="AlertTriangle" size={16} className="text-error" />
                  <p className="text-sm text-error">{authError}</p>
                </div>
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Icon name="LogIn" size={16} />
                  <span>Sign In</span>
                </div>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
