import type { UserRole } from '@prisma/client';

export type RoleDashboardConfig = {
  title: string;
  subtitle: string;
  badge: string;
  navigation: Array<{ href: string; label: string; description?: string }>;
  shortcuts: Array<{ href: string; label: string; description: string }>;
};

const routeAccess: Record<string, UserRole[]> = {
  '/dashboard': ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF'],
  '/admin': ['OWNER', 'ADMIN'],
  '/inventory': ['OWNER', 'ADMIN', 'STAFF'],
  '/pos': ['OWNER', 'ADMIN', 'CASHIER', 'STAFF'],
  '/pos/invoice': ['OWNER', 'ADMIN', 'CASHIER', 'STAFF'],
  '/pos/payment': ['OWNER', 'ADMIN', 'CASHIER', 'STAFF'],
  '/hotel': ['OWNER', 'ADMIN', 'CASHIER', 'STAFF', 'CUSTOMER'],
  '/clinical': ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF'],
  '/reports': ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF'],
  '/settings': ['OWNER', 'ADMIN'],
  '/monitoring': ['OWNER', 'ADMIN'],
  '/customers': ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF'],
  '/pets': ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF', 'CUSTOMER'],
  '/appointment': ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF', 'CUSTOMER'],
  '/daily-task': ['OWNER', 'ADMIN', 'STAFF'],
  '/medical-history': ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF', 'CUSTOMER'],
  '/invoice': ['OWNER', 'ADMIN', 'CASHIER', 'STAFF', 'CUSTOMER'],
  '/profile': ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF', 'CUSTOMER'],
  '/medical-record': ['OWNER', 'ADMIN', 'DOCTOR'],
  '/prescription': ['OWNER', 'ADMIN', 'DOCTOR'],
  '/laboratory': ['OWNER', 'ADMIN', 'DOCTOR'],
  '/vaccination': ['OWNER', 'ADMIN', 'DOCTOR'],
  '/portal': ['CUSTOMER'],
};

export function canAccessRoute(role: UserRole, pathname: string) {
  const normalizedPath = pathname === '/' ? '/dashboard' : pathname;
  const match = Object.entries(routeAccess).find(([path]) => normalizedPath === path || normalizedPath.startsWith(`${path}/`));
  if (!match) {
    return false;
  }
  return match[1].includes(role);
}

export function getRoleRedirectPath(role: UserRole) {
  return role === 'CUSTOMER' ? '/portal' : '/dashboard';
}

export function getDashboardRoleConfig(role: UserRole): RoleDashboardConfig {
  switch (role) {
    case 'OWNER':
      return {
        title: 'Ringkasan operasional',
        subtitle: 'Pantau kinerja klinik, pet hotel, dan bisnis dari satu dashboard eksekutif yang kaya insight.',
        badge: 'Owner Overview',
        navigation: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/clinical', label: 'Clinical' },
          { href: '/inventory', label: 'Inventory' },
          { href: '/pos', label: 'POS' },
          { href: '/hotel', label: 'Pet Hotel' },
          { href: '/customers', label: 'Customer' },
          { href: '/reports', label: 'Reports' },
          { href: '/admin', label: 'Audit' },
          { href: '/settings', label: 'Settings' },
        ],
        shortcuts: [
          { href: '/admin', label: 'Administrasi', description: 'Kelola pengguna dan konfigurasi utama' },
          { href: '/customers', label: 'Pelanggan', description: 'Pantau customer, pet, dan aktivitas' },
          { href: '/reports', label: 'Laporan', description: 'Lihat insight finansial dan operasional' },
        ],
      };
    case 'ADMIN':
      return {
        title: 'Ringkasan operasional',
        subtitle: 'Kelola pelanggan, inventaris, dan data operasional harian secara terpusat.',
        badge: 'Admin Overview',
        navigation: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/customers', label: 'Customer' },
          { href: '/pets', label: 'Pet' },
          { href: '/clinical', label: 'Clinical' },
          { href: '/inventory', label: 'Inventory' },
          { href: '/pos', label: 'POS' },
          { href: '/hotel', label: 'Hotel' },
          { href: '/admin', label: 'Employee' },
        ],
        shortcuts: [
          { href: '/customers', label: 'Pelanggan', description: 'Kelola data customer dan pet' },
          { href: '/inventory', label: 'Inventaris', description: 'Pantau stok dan restock' },
          { href: '/reports', label: 'Laporan', description: 'Lihat ringkasan performa harian' },
        ],
      };
    case 'DOCTOR':
      return {
        title: 'Dashboard klinis',
        subtitle: 'Fokus pada janji temu, rekam medis, dan pemantauan status pasien.',
        badge: 'Clinical Focus',
        navigation: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/clinical', label: 'Clinical' },
          { href: '/medical-record', label: 'Medical Record' },
          { href: '/prescription', label: 'Prescription' },
          { href: '/laboratory', label: 'Laboratory' },
          { href: '/vaccination', label: 'Vaccination' },
          { href: '/customers', label: 'Customer' },
        ],
        shortcuts: [
          { href: '/clinical', label: 'Klinis', description: 'Buka antrian dan rekam medis' },
          { href: '/customers', label: 'Pelanggan', description: 'Lihat data customer dan hewan' },
          { href: '/reports', label: 'Laporan', description: 'Pantau performa klinis' },
        ],
      };
    case 'CASHIER':
      return {
        title: 'Dashboard POS',
        subtitle: 'Prioritaskan transaksi, pembayaran, dan status invoice yang sedang berjalan.',
        badge: 'POS Focus',
        navigation: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/pos', label: 'POS' },
          { href: '/pos/invoice', label: 'Invoice' },
          { href: '/pos/payment', label: 'Payment' },
          { href: '/customers', label: 'Customer' },
          { href: '/reports', label: 'Reports' },
        ],
        shortcuts: [
          { href: '/pos', label: 'POS', description: 'Kelola transaksi dan pembayaran' },
          { href: '/reports', label: 'Laporan', description: 'Pantau performa penjualan' },
          { href: '/customers', label: 'Pelanggan', description: 'Lihat data customer yang diproses' },
        ],
      };
    case 'STAFF':
      return {
        title: 'Dashboard operasional',
        subtitle: 'Bantu operasional inventaris, petshop, dan pet hotel harian.',
        badge: 'Staff Focus',
        navigation: [
          { href: '/dashboard', label: 'Dashboard' },
          { href: '/inventory', label: 'Inventory' },
          { href: '/hotel', label: 'Pet Hotel' },
          { href: '/daily-task', label: 'Daily Task' },
          { href: '/reports', label: 'Reports' },
        ],
        shortcuts: [
          { href: '/inventory', label: 'Inventaris', description: 'Pantau stok dan barang masuk' },
          { href: '/hotel', label: 'Pet Hotel', description: 'Kelola booking dan check-in' },
          { href: '/reports', label: 'Laporan', description: 'Pantau aktivitas harian' },
        ],
      };
    case 'CUSTOMER':
    default:
      return {
        title: 'Portal pelanggan',
        subtitle: 'Lihat profil, hewan peliharaan, janji temu, dan notifikasi pribadi.',
        badge: 'Customer Portal',
        navigation: [
          { href: '/portal', label: 'Dashboard' },
          { href: '/pets', label: 'My Pets' },
          { href: '/appointment', label: 'Appointment' },
          { href: '/hotel', label: 'Hotel' },
          { href: '/medical-history', label: 'Medical History' },
          { href: '/invoice', label: 'Invoice' },
          { href: '/profile', label: 'Profile' },
        ],
        shortcuts: [
          { href: '/portal', label: 'Portal', description: 'Akses informasi pelanggan' },
        ],
      };
  }
}
