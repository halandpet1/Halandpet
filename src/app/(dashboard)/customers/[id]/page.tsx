import { notFound } from 'next/navigation';
import { getCustomerById } from '@/actions/customer.actions';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getCustomerById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Customer</p>
        <h1 className="text-3xl font-semibold">{result.data.name}</h1>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <dl className="grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-400">Telepon</dt>
            <dd className="mt-1">{result.data.phone ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Email</dt>
            <dd className="mt-1">{result.data.email ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Alamat</dt>
            <dd className="mt-1">{result.data.address ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Walk-in</dt>
            <dd className="mt-1">{result.data.isWalkIn ? 'Ya' : 'Tidak'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
