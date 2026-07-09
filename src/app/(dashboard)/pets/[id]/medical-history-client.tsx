'use client';

import { useCallback, useEffect, useState } from 'react';
import { createAllergy, createAttachment, createDisease, createVaccination, createWeight, listMedicalHistory } from '@/actions/medical-history.actions';

type MedicalHistoryData = {
  vaccinations: Array<{ id: string; vaccineName: string; date: string | Date; nextDueDate?: string | Date | null; notes?: string | null }>;
  weights: Array<{ id: string; date: string | Date; weight: string | number; notes?: string | null }>;
  allergies: Array<{ id: string; allergen: string; severity?: string | null; notes?: string | null }>;
  diseases: Array<{ id: string; diseaseName: string; diagnosedDate: string | Date; status?: string | null; notes?: string | null }>;
  attachments: Array<{ id: string; fileName: string; fileUrl: string; mimeType: string }>;
};

export function MedicalHistoryClient({ petId }: { petId: string }) {
  const [data, setData] = useState<MedicalHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const result = await listMedicalHistory(petId);
    if (result.success) {
      setData(result.data as unknown as MedicalHistoryData);
    } else {
      setError(result.error ?? 'Tidak dapat memuat riwayat medis');
    }
    setLoading(false);
  }, [petId]);

  useEffect(() => {
    void (async () => {
      await loadHistory();
    })();
  }, [loadHistory]);

  async function handleCreateVaccination() {
    const result = await createVaccination({ petId, vaccineName: 'Rabies', date: new Date().toISOString(), notes: 'Added from Module 2 audit' });
    if (result.success) {
      await loadHistory();
      return;
    }
    setError(result.error);
  }

  async function handleCreateWeight() {
    const result = await createWeight({ petId, date: new Date().toISOString(), weight: 2.5, notes: 'Weight entry from Module 2 audit' });
    if (result.success) {
      await loadHistory();
      return;
    }
    setError(result.error);
  }

  async function handleCreateAllergy() {
    const result = await createAllergy({ petId, allergen: 'Chicken', severity: 'MILD', notes: 'Added from Module 2 audit' });
    if (result.success) {
      await loadHistory();
      return;
    }
    setError(result.error);
  }

  async function handleCreateDisease() {
    const result = await createDisease({ petId, diseaseName: 'Fever', diagnosedDate: new Date().toISOString(), status: 'ACTIVE', notes: 'Added from Module 2 audit' });
    if (result.success) {
      await loadHistory();
      return;
    }
    setError(result.error);
  }

  async function handleCreateAttachment() {
    const result = await createAttachment({ entityType: 'PET', entityId: petId, fileName: 'record.pdf', fileUrl: '/files/record.pdf', mimeType: 'application/pdf', fileSize: 1 });
    if (result.success) {
      await loadHistory();
      return;
    }
    setError(result.error);
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Vaccination History</h2>
            <button onClick={() => void handleCreateVaccination()} className="rounded-lg border border-white/10 px-3 py-2">Tambah</button>
          </div>
          {loading ? <p className="text-sm text-slate-400">Memuat...</p> : null}
          <ul className="space-y-2 text-sm text-slate-300">
            {(data?.vaccinations ?? []).map((item) => <li key={item.id} className="rounded-lg border border-white/10 p-3">{item.vaccineName} • {item.date instanceof Date ? item.date.toISOString() : item.date}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Weight History</h2>
            <button onClick={() => void handleCreateWeight()} className="rounded-lg border border-white/10 px-3 py-2">Tambah</button>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            {(data?.weights ?? []).map((item) => <li key={item.id} className="rounded-lg border border-white/10 p-3">{item.weight} kg • {item.date instanceof Date ? item.date.toISOString() : item.date}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Allergies</h2>
            <button onClick={() => void handleCreateAllergy()} className="rounded-lg border border-white/10 px-3 py-2">Tambah</button>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            {(data?.allergies ?? []).map((item) => <li key={item.id} className="rounded-lg border border-white/10 p-3">{item.allergen}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Disease History</h2>
            <button onClick={() => void handleCreateDisease()} className="rounded-lg border border-white/10 px-3 py-2">Tambah</button>
          </div>
          <ul className="space-y-2 text-sm text-slate-300">
            {(data?.diseases ?? []).map((item) => <li key={item.id} className="rounded-lg border border-white/10 p-3">{item.diseaseName}</li>)}
          </ul>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Attachments</h2>
          <button onClick={() => void handleCreateAttachment()} className="rounded-lg border border-white/10 px-3 py-2">Tambah</button>
        </div>
        <ul className="space-y-2 text-sm text-slate-300">
          {(data?.attachments ?? []).map((item) => <li key={item.id} className="rounded-lg border border-white/10 p-3"><a href={item.fileUrl} className="text-blue-400 underline">{item.fileName}</a></li>)}
        </ul>
      </div>
    </div>
  );
}
