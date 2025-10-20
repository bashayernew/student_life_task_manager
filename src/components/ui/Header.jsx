import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';

const Header = () => {
  const { user, userProfile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isAdmin = userProfile?.role === 'admin';
  const isManager = userProfile?.role === 'manager' || userProfile?.role === 'admin';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Icon name="CheckSquare" size={20} color="white" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Task Manager</h1>
          </div>

          {/* Navigation */}
          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {isAdmin && (
                <Button
                  variant="ghost"
                  onClick={() => handleNavigation('/admin-task-management')}
                  className="flex items-center space-x-2"
                >
                  <Icon name="Settings" size={16} />
                  <span>Admin Dashboard</span>
                </Button>
              )}
              
              <Button
                variant="ghost"
                onClick={() => handleNavigation('/staff-dashboard')}
                className="flex items-center space-x-2"
              >
                <Icon name="User" size={16} />
                <span>My Tasks</span>
              </Button>
            </nav>
          )}

          {/* User Menu */}
          {user ? (
            <div className="flex items-center space-x-4">
              {/* User Info */}
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-foreground">
                  {userProfile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {userProfile?.role?.toUpperCase() || 'STAFF'}
                </p>
              </div>

              {/* User Avatar */}
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <Icon name="User" size={16} color="white" />
              </div>

              {/* Sign Out Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center space-x-2"
              >
                <Icon name="LogOut" size={14} />
                <span className="hidden sm:block">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => handleNavigation('/login')}
              className="flex items-center space-x-2"
            >
              <Icon name="LogIn" size={16} />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;