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
    const ownerConfig = getDashboardRoleConfig('OWNER');

    expect(doctorConfig.title).toContain('Dashboard');
    expect(doctorConfig.shortcuts.some((shortcut) => shortcut.href === '/clinical')).toBe(true);
    expect(doctorConfig.navigation.some((item) => item.href === '/medical-record')).toBe(true);
    expect(cashierConfig.title).toContain('POS');
    expect(cashierConfig.shortcuts.some((shortcut) => shortcut.href === '/pos')).toBe(true);
    expect(ownerConfig.navigation.some((item) => item.href === '/reports')).toBe(true);
  });

  it('allows every dashboard navigation item for the role that exposes it', () => {
    const roles: Array<'OWNER' | 'ADMIN' | 'DOCTOR' | 'CASHIER' | 'STAFF' | 'CUSTOMER'> = ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF', 'CUSTOMER'];
    for (const role of roles) {
      const config = getDashboardRoleConfig(role);
      for (const item of [...config.navigation, ...config.shortcuts]) {
        expect(canAccessRoute(role, item.href)).toBe(true);
      }
    }
  });
});
