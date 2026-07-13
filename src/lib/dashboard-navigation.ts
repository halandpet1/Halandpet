const labelMap: Record<string, string> = {
  dashboard: 'Dashboard',
  portal: 'Portal',
  customers: 'Customers',
  pets: 'My Pets',
  clinical: 'Clinical',
  inventory: 'Inventory',
  pos: 'POS',
  hotel: 'Hotel',
  reports: 'Reports',
  settings: 'Settings',
  monitoring: 'Monitoring',
  admin: 'Administration',
  appointment: 'Appointment',
  'medical-record': 'Medical Record',
  prescription: 'Prescription',
  laboratory: 'Laboratory',
  vaccination: 'Vaccination',
  'daily-task': 'Daily Task',
  'medical-history': 'Medical History',
  invoice: 'Invoice',
  profile: 'Profile',
  payment: 'Payment',
};

export function buildBreadcrumbItems(pathname: string) {
  if (pathname === '/dashboard') {
    return [{ href: '/dashboard', label: 'Dashboard' }];
  }

  const segments = pathname.split('/').filter(Boolean);
  const items = segments.reduce<Array<{ href: string; label: string }>>((acc, segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    acc.push({ href, label: labelMap[segment] ?? segment.replace(/-/g, ' ') });
    return acc;
  }, []);

  if (segments[0] && segments[0] !== 'dashboard') {
    return [{ href: '/dashboard', label: 'Dashboard' }, ...items];
  }

  return items;
}
