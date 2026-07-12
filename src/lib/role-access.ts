import type { UserRole } from '@prisma/client';

export type RoleDashboardConfig = {
  title: string;
  subtitle: string;
  badge: string;
  shortcuts: Array<{ href: string; label: string; description: string }>;
};

const routeAccess: Record<string, UserRole[]> = {
  '/dashboard': ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF'],
  '/admin': ['OWNER', 'ADMIN'],
  '/inventory': ['OWNER', 'ADMIN', 'STAFF'],
  '/pos': ['OWNER', 'ADMIN', 'CASHIER', 'STAFF'],
  '/hotel': ['OWNER', 'ADMIN', 'CASHIER', 'STAFF'],
  '/clinical': ['OWNER', 'ADMIN', 'DOCTOR', 'STAFF'],
  '/reports': ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF'],
  '/settings': ['OWNER', 'ADMIN'],
  '/monitoring': ['OWNER', 'ADMIN'],
  '/customers': ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF'],
  '/pets': ['OWNER', 'ADMIN', 'DOCTOR', 'CASHIER', 'STAFF'],
  '/portal': ['CUSTOMER'],
};

export function canAccessRoute(role: UserRole, pathname: string) {
  const normalizedPath = pathname === '/' ? '/dashboard' : pathname;
  const match = Object.entries(routeAccess).find(([path]) => normalizedPath === path || normalizedPath.startsWith(`${path}/`));
  if (!match) {
    return role === 'CUSTOMER' ? false : true;
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
        subtitle: 'Pantau kinerja klinik, pet hotel, dan bisnis dari satu dashboard eksekutif.',
        badge: 'Owner Overview',
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
        shortcuts: [
          { href: '/portal', label: 'Portal', description: 'Akses informasi pelanggan' },
        ],
      };
  }
}
