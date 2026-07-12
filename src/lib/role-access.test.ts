import { describe, expect, it } from 'vitest';
import { canAccessRoute, getDashboardRoleConfig, getRoleRedirectPath } from '@/lib/role-access';

describe('role access helpers', () => {
  it('routes customers to the portal and internal roles to the dashboard', () => {
    expect(getRoleRedirectPath('CUSTOMER')).toBe('/portal');
    expect(getRoleRedirectPath('ADMIN')).toBe('/dashboard');
    expect(getRoleRedirectPath('DOCTOR')).toBe('/dashboard');
  });

  it('allows the expected modules per role', () => {
    expect(canAccessRoute('OWNER', '/admin')).toBe(true);
    expect(canAccessRoute('ADMIN', '/inventory')).toBe(true);
    expect(canAccessRoute('DOCTOR', '/clinical')).toBe(true);
    expect(canAccessRoute('CASHIER', '/pos')).toBe(true);
    expect(canAccessRoute('STAFF', '/hotel')).toBe(true);
    expect(canAccessRoute('CUSTOMER', '/portal')).toBe(true);
    expect(canAccessRoute('CUSTOMER', '/inventory')).toBe(false);
  });

  it('builds role-specific dashboard guidance for each role', () => {
    const doctorConfig = getDashboardRoleConfig('DOCTOR');
    const cashierConfig = getDashboardRoleConfig('CASHIER');

    expect(doctorConfig.title).toContain('Dashboard');
    expect(doctorConfig.shortcuts.some((shortcut) => shortcut.href === '/clinical')).toBe(true);
    expect(cashierConfig.title).toContain('POS');
    expect(cashierConfig.shortcuts.some((shortcut) => shortcut.href === '/pos')).toBe(true);
  });
});
