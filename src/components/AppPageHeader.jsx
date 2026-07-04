import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import KTechBrand from './KTechBrand';
import Button from './ui/Button';
import Icon from './AppIcon';
import { cn } from '../utils/cn';
import { getAppNavItems } from '../utils/navItems';

const AppPageHeader = ({
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
}) => {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = getAppNavItems(userProfile?.role);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const handleNavigate = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/login');
  };

  const renderNavButton = (item, className) => (
    <Button
      key={item.key}
      type="button"
      onClick={() => handleNavigate(item.path)}
      className={cn(
        'ktech-header-btn',
        location.pathname === item.path && 'bg-primary-foreground/20',
        className
      )}
    >
      <Icon name={item.icon} size={16} className="mr-2 shrink-0" />
      {item.label}
    </Button>
  );

  const mobileDrawer =
    menuOpen && typeof document !== 'undefined'
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-[100] bg-black/40 md:hidden"
              onClick={() => setMenuOpen(false)}
            />
            <aside
              className="fixed top-0 right-0 z-[101] flex h-full w-[min(85vw,320px)] flex-col bg-primary text-primary-foreground shadow-elevation md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="flex items-center justify-between border-b border-primary-foreground/20 px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {userProfile?.full_name || userProfile?.email || 'Menu'}
                  </p>
                  {userProfile?.role ? (
                    <p className="text-xs uppercase tracking-wide opacity-70">
                      {userProfile.role}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  className="ktech-header-btn shrink-0"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <Icon name="X" size={18} />
                </Button>
              </div>

              <nav className="flex-1 overflow-y-auto px-3 py-4">
                <div className="space-y-2">
                  {backTo ? (
                    <button
                      type="button"
                      onClick={() => handleNavigate(backTo)}
                      className="flex w-full items-center rounded-md px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-primary-foreground/10"
                    >
                      <Icon name="ArrowLeft" size={18} className="mr-3 shrink-0" />
                      {backLabel}
                    </button>
                  ) : null}

                  {navItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleNavigate(item.path)}
                      className={cn(
                        'flex w-full items-center rounded-md px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-primary-foreground/10',
                        location.pathname === item.path && 'bg-primary-foreground/15'
                      )}
                    >
                      <Icon name={item.icon} size={18} className="mr-3 shrink-0" />
                      {item.label}
                    </button>
                  ))}
                </div>
              </nav>

              <div className="border-t border-primary-foreground/20 p-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center rounded-md px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-primary-foreground/10"
                >
                  <Icon name="LogOut" size={18} className="mr-3 shrink-0" />
                  Logout
                </button>
              </div>
            </aside>
          </>,
          document.body
        )
      : null;

  return (
    <header className="ktech-page-header sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-16">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {backTo ? (
              <Button
                type="button"
                onClick={() => navigate(backTo)}
                className="ktech-header-btn shrink-0 px-2 sm:px-3"
                aria-label={backLabel}
              >
                <Icon name="ArrowLeft" size={16} className="sm:mr-2" />
                <span className="hidden sm:inline">{backLabel}</span>
              </Button>
            ) : null}
            <KTechBrand
              title={title}
              subtitle={subtitle}
              onDark
              titleClassName="text-primary-foreground text-base sm:text-xl"
              subtitleClassName="hidden sm:block"
              className="min-w-0"
            />
          </div>

          <nav className="hidden md:flex items-center gap-2 shrink-0">
            {navItems.map((item) => renderNavButton(item))}
            <Button type="button" onClick={handleLogout} className="ktech-header-btn">
              <Icon name="LogOut" size={16} className="mr-2" />
              Logout
            </Button>
          </nav>

          <Button
            type="button"
            className="ktech-header-btn md:hidden shrink-0"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="Menu" size={20} />
          </Button>
        </div>
      </div>
      {mobileDrawer}
    </header>
  );
};

export default AppPageHeader;
