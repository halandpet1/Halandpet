import { describe, expect, it } from 'vitest';
import { buildBreadcrumbItems } from './dashboard-navigation';

describe('buildBreadcrumbItems', () => {
  it('creates a breadcrumb trail for nested dashboard routes', () => {
    expect(buildBreadcrumbItems('/pos/invoice/payment')).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/pos', label: 'POS' },
      { href: '/pos/invoice', label: 'Invoice' },
      { href: '/pos/invoice/payment', label: 'Payment' },
    ]);
  });

  it('returns the dashboard breadcrumb for the root dashboard', () => {
    expect(buildBreadcrumbItems('/dashboard')).toEqual([
      { href: '/dashboard', label: 'Dashboard' },
    ]);
  });
});
