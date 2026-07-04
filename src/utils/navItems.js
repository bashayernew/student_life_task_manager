export function getAppNavItems(role) {
  const items = [
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
    { key: 'tasks', label: 'Tasks', path: '/tasks', icon: 'CheckSquare' },
  ];

  if (role === 'admin') {
    items.push(
      { key: 'staff', label: 'Manage Staff', path: '/staff', icon: 'Users' },
      { key: 'departments', label: 'Departments', path: '/departments', icon: 'Building2' }
    );
  }

  items.push({ key: 'account', label: 'Account', path: '/account', icon: 'User' });

  return items;
}
