import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import KTechBrand from '../KTechBrand';

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 ktech-page-header shadow-elevation">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <KTechBrand
            title="Task Manager"
            onDark
            titleClassName="text-primary-foreground"
          />

          {user && (
            <nav className="hidden md:flex items-center space-x-1">
              {isAdmin && (
                <Button
                  variant="ghost"
                  onClick={() => handleNavigation('/admin-task-management')}
                  className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                >
                  <Icon name="Settings" size={16} />
                  <span>Admin Dashboard</span>
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => handleNavigation('/staff-dashboard')}
                className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Icon name="User" size={16} />
                <span>My Tasks</span>
              </Button>
            </nav>
          )}

          {user ? (
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-primary-foreground">
                  {userProfile?.full_name || 'User'}
                </p>
                <p className="text-xs text-primary-foreground opacity-70">
                  {userProfile?.role?.toUpperCase() || 'STAFF'}
                </p>
              </div>

              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <Icon name="User" size={16} color="white" />
              </div>

              <Button
                size="sm"
                onClick={handleSignOut}
                className="ktech-header-btn"
              >
                <Icon name="LogOut" size={14} />
                <span className="hidden sm:block">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button onClick={() => handleNavigation('/login')}>
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
