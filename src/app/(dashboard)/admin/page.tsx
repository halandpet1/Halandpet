import { db } from '@/lib/db';

export default async function AdminPage() {
  if (!db || process.env.NEXT_PHASE === 'phase-production-build') {
    return <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">Database belum dikonfigurasi.</div>;
  }

  const users = await db.user.findMany({ where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 10 });

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Administrasi</p>
        <h1 className="text-3xl font-semibold">Manajemen pengguna</h1>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-800 text-left text-slate-300">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-t border-white/10">
                <td className="px-4 py-3">{user.username}</td>
                <td className="px-4 py-3">{user.fullName}</td>
                <td className="px-4 py-3">{user.role}</td>
                <td className="px-4 py-3">{user.isActive ? 'Aktif' : 'Nonaktif'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
