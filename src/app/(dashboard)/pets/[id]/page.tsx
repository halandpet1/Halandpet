import { notFound } from 'next/navigation';
import { getPetById } from '@/actions/customer.actions';
import { MedicalHistoryClient } from './medical-history-client';

export default async function PetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getPetById(id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Pet</p>
        <h1 className="text-3xl font-semibold">{result.data.name}</h1>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <dl className="grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-400">Pemilik</dt>
            <dd className="mt-1">{result.data.customer?.name ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Spesies</dt>
            <dd className="mt-1">{result.data.species?.name ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Ras</dt>
            <dd className="mt-1">{result.data.breed?.name ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Mikrochip</dt>
            <dd className="mt-1">{result.data.microchipNumber ?? '-'}</dd>
          </div>
        </dl>
      </div>
      <MedicalHistoryClient petId={result.data.id} />
    </div>
  );
}
