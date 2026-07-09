'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createAllergy,
  createAttachment,
  createDisease,
  createVaccination,
  createWeight,
  listMedicalHistory,
  softDeleteAllergy,
  softDeleteAttachment,
  softDeleteDisease,
  softDeleteVaccination,
  softDeleteWeight,
  updateAllergy,
  updateAttachment,
  updateDisease,
  updateVaccination,
  updateWeight,
} from '@/actions/medical-history.actions';

type MedicalHistoryData = {
  vaccinations: Array<{ id: string; vaccineName: string; date: string | Date; nextDueDate?: string | Date | null; batchNumber?: string | null; veterinarian?: string | null; notes?: string | null }>;
  weights: Array<{ id: string; date: string | Date; weight: string | number; notes?: string | null }>;
  allergies: Array<{ id: string; allergen: string; severity?: string | null; notes?: string | null; createdAt?: string | Date | null }>;
  diseases: Array<{ id: string; diseaseName: string; diagnosedDate: string | Date; resolvedDate?: string | Date | null; status?: string | null; notes?: string | null }>;
  attachments: Array<{ id: string; fileName: string; fileUrl: string; mimeType: string; fileSize?: number | null; createdAt?: string | Date | null }>;
};

type SectionKind = 'vaccination' | 'weight' | 'allergy' | 'disease' | 'attachment';

type FormState = {
  vaccineName: string;
  date: string;
  nextDueDate: string;
  batchNumber: string;
  veterinarian: string;
  notes: string;
  weight: string;
  allergen: string;
  severity: string;
  diseaseName: string;
  diagnosedDate: string;
  resolvedDate: string;
  status: string;
  attachmentName: string;
  attachmentUrl: string;
  attachmentMimeType: string;
};

const initialFormState: FormState = {
  vaccineName: '',
  date: '',
  nextDueDate: '',
  batchNumber: '',
  veterinarian: '',
  notes: '',
  weight: '',
  allergen: '',
  severity: '',
  diseaseName: '',
  diagnosedDate: '',
  resolvedDate: '',
  status: 'ACTIVE',
  attachmentName: '',
  attachmentUrl: '',
  attachmentMimeType: 'application/pdf',
};

export function MedicalHistoryClient({ petId }: { petId: string }) {
  const [data, setData] = useState<MedicalHistoryData | null>(null);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKind>('vaccination');
  const [editingKind, setEditingKind] = useState<SectionKind | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);

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
    const timeoutId = window.setTimeout(() => {
      void loadHistory();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadHistory]);

  const timeline = useMemo(() => {
    const events = [
      ...(data?.vaccinations ?? []).map((item) => ({ id: item.id, kind: 'vaccination' as const, title: item.vaccineName, date: item.date, detail: item.notes ?? 'Vaksinasi' })),
      ...(data?.weights ?? []).map((item) => ({ id: item.id, kind: 'weight' as const, title: `${item.weight} kg`, date: item.date, detail: item.notes ?? 'Berat badan' })),
      ...(data?.allergies ?? []).map((item) => ({ id: item.id, kind: 'allergy' as const, title: item.allergen, date: item.createdAt ?? new Date(), detail: item.notes ?? 'Alergi' })),
      ...(data?.diseases ?? []).map((item) => ({ id: item.id, kind: 'disease' as const, title: item.diseaseName, date: item.diagnosedDate, detail: item.notes ?? 'Riwayat penyakit' })),
      ...(data?.attachments ?? []).map((item) => ({ id: item.id, kind: 'attachment' as const, title: item.fileName, date: item.createdAt ?? new Date(), detail: item.mimeType })),
    ];

    return events.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
  }, [data]);

  async function resetForm() {
    setForm(initialFormState);
    setEditingId(null);
    setEditingKind(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (editingKind === 'vaccination') {
      const result = editingId
        ? await updateVaccination(editingId, { petId, vaccineName: form.vaccineName, date: form.date, nextDueDate: form.nextDueDate, batchNumber: form.batchNumber, veterinarian: form.veterinarian, notes: form.notes })
        : await createVaccination({ petId, vaccineName: form.vaccineName, date: form.date, nextDueDate: form.nextDueDate, batchNumber: form.batchNumber, veterinarian: form.veterinarian, notes: form.notes });
      if (result.success) { setSuccess('Vaksinasi disimpan'); await loadHistory(); await resetForm(); return; }
      setError(result.error);
      return;
    }

    if (editingKind === 'weight') {
      const result = editingId
        ? await updateWeight(editingId, { petId, date: form.date, weight: Number(form.weight), notes: form.notes })
        : await createWeight({ petId, date: form.date, weight: Number(form.weight), notes: form.notes });
      if (result.success) { setSuccess('Berat badan disimpan'); await loadHistory(); await resetForm(); return; }
      setError(result.error);
      return;
    }

    if (editingKind === 'allergy') {
      const result = editingId
        ? await updateAllergy(editingId, { petId, allergen: form.allergen, severity: form.severity, notes: form.notes })
        : await createAllergy({ petId, allergen: form.allergen, severity: form.severity, notes: form.notes });
      if (result.success) { setSuccess('Alergi disimpan'); await loadHistory(); await resetForm(); return; }
      setError(result.error);
      return;
    }

    if (editingKind === 'disease') {
      const result = editingId
        ? await updateDisease(editingId, { petId, diseaseName: form.diseaseName, diagnosedDate: form.diagnosedDate, resolvedDate: form.resolvedDate, status: form.status, notes: form.notes })
        : await createDisease({ petId, diseaseName: form.diseaseName, diagnosedDate: form.diagnosedDate, resolvedDate: form.resolvedDate, status: form.status, notes: form.notes });
      if (result.success) { setSuccess('Riwayat penyakit disimpan'); await loadHistory(); await resetForm(); return; }
      setError(result.error);
      return;
    }

    if (editingKind === 'attachment') {
      const result = editingId
        ? await updateAttachment(editingId, { entityType: 'PET', entityId: petId, fileName: form.attachmentName, fileUrl: form.attachmentUrl, mimeType: form.attachmentMimeType, fileSize: 1 })
        : await createAttachment({ entityType: 'PET', entityId: petId, fileName: form.attachmentName, fileUrl: form.attachmentUrl, mimeType: form.attachmentMimeType, fileSize: 1 });
      if (result.success) { setSuccess('Lampiran disimpan'); await loadHistory(); await resetForm(); return; }
      setError(result.error);
    }
  }

  async function handleDelete(kind: SectionKind, id: string) {
    setError(null);
    setSuccess(null);
    const result = kind === 'vaccination' ? await softDeleteVaccination(id) : kind === 'weight' ? await softDeleteWeight(id) : kind === 'allergy' ? await softDeleteAllergy(id) : kind === 'disease' ? await softDeleteDisease(id) : await softDeleteAttachment(id);
    if (result.success) {
      setSuccess('Item dihapus');
      await loadHistory();
      return;
    }
    setError(result.error);
  }

  function startEdit(kind: SectionKind, item: Record<string, unknown>) {
    setActiveSection(kind);
    setEditingKind(kind);
    setEditingId(item.id as string);
    if (kind === 'vaccination') {
      setForm({
        ...initialFormState,
        vaccineName: (item.vaccineName as string) ?? '',
        date: (item.date as string) ? new Date(item.date as string).toISOString().slice(0, 10) : '',
        nextDueDate: (item.nextDueDate as string) ? new Date(item.nextDueDate as string).toISOString().slice(0, 10) : '',
        batchNumber: (item.batchNumber as string) ?? '',
        veterinarian: (item.veterinarian as string) ?? '',
        notes: (item.notes as string) ?? '',
      });
      return;
    }
    if (kind === 'weight') {
      setForm({
        ...initialFormState,
        date: (item.date as string) ? new Date(item.date as string).toISOString().slice(0, 10) : '',
        weight: String(item.weight ?? ''),
        notes: (item.notes as string) ?? '',
      });
      return;
    }
    if (kind === 'allergy') {
      setForm({
        ...initialFormState,
        allergen: (item.allergen as string) ?? '',
        severity: (item.severity as string) ?? '',
        notes: (item.notes as string) ?? '',
      });
      return;
    }
    if (kind === 'disease') {
      setForm({
        ...initialFormState,
        diseaseName: (item.diseaseName as string) ?? '',
        diagnosedDate: (item.diagnosedDate as string) ? new Date(item.diagnosedDate as string).toISOString().slice(0, 10) : '',
        resolvedDate: (item.resolvedDate as string) ? new Date(item.resolvedDate as string).toISOString().slice(0, 10) : '',
        status: (item.status as string) ?? 'ACTIVE',
        notes: (item.notes as string) ?? '',
      });
      return;
    }
    setForm({
      ...initialFormState,
      attachmentName: (item.fileName as string) ?? '',
      attachmentUrl: (item.fileUrl as string) ?? '',
      attachmentMimeType: (item.mimeType as string) ?? 'application/pdf',
    });
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</div> : null}
      {success ? <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4 text-sm text-emerald-200">{success}</div> : null}

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {(['vaccination', 'weight', 'allergy', 'disease', 'attachment'] as const).map((section) => (
            <button key={section} type="button" onClick={() => { setActiveSection(section); setEditingKind(section); }} className={`rounded-full px-3 py-2 text-sm ${activeSection === section ? 'bg-blue-600 text-white' : 'border border-white/10 text-slate-300'}`}>
              {section === 'vaccination' ? 'Vaksinasi' : section === 'weight' ? 'Berat' : section === 'allergy' ? 'Alergi' : section === 'disease' ? 'Penyakit' : 'Lampiran'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {activeSection === 'vaccination' ? (
            <>
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block">Nama vaksin</span>
                <input value={form.vaccineName} onChange={(event) => setForm((current) => ({ ...current, vaccineName: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="mb-2 block">Tanggal</span>
                <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="mb-2 block">Tanggal berikutnya</span>
                <input type="date" value={form.nextDueDate} onChange={(event) => setForm((current) => ({ ...current, nextDueDate: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="mb-2 block">Batch</span>
                <input value={form.batchNumber} onChange={(event) => setForm((current) => ({ ...current, batchNumber: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="mb-2 block">Dokter / Petugas</span>
                <input value={form.veterinarian} onChange={(event) => setForm((current) => ({ ...current, veterinarian: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block">Catatan</span>
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
            </>
          ) : null}

          {activeSection === 'weight' ? (
            <>
              <label className="text-sm">
                <span className="mb-2 block">Tanggal</span>
                <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="mb-2 block">Berat (kg)</span>
                <input type="number" step="0.1" value={form.weight} onChange={(event) => setForm((current) => ({ ...current, weight: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block">Catatan</span>
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
            </>
          ) : null}

          {activeSection === 'allergy' ? (
            <>
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block">Alergen</span>
                <input value={form.allergen} onChange={(event) => setForm((current) => ({ ...current, allergen: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="mb-2 block">Severity</span>
                <input value={form.severity} onChange={(event) => setForm((current) => ({ ...current, severity: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block">Catatan</span>
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
            </>
          ) : null}

          {activeSection === 'disease' ? (
            <>
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block">Nama penyakit</span>
                <input value={form.diseaseName} onChange={(event) => setForm((current) => ({ ...current, diseaseName: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="mb-2 block">Tanggal diagnosa</span>
                <input type="date" value={form.diagnosedDate} onChange={(event) => setForm((current) => ({ ...current, diagnosedDate: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="mb-2 block">Tanggal selesai</span>
                <input type="date" value={form.resolvedDate} onChange={(event) => setForm((current) => ({ ...current, resolvedDate: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="mb-2 block">Status</span>
                <input value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block">Catatan</span>
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
            </>
          ) : null}

          {activeSection === 'attachment' ? (
            <>
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block">Nama file</span>
                <input value={form.attachmentName} onChange={(event) => setForm((current) => ({ ...current, attachmentName: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm md:col-span-2">
                <span className="mb-2 block">URL file</span>
                <input value={form.attachmentUrl} onChange={(event) => setForm((current) => ({ ...current, attachmentUrl: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="mb-2 block">Tipe MIME</span>
                <input value={form.attachmentMimeType} onChange={(event) => setForm((current) => ({ ...current, attachmentMimeType: event.target.value }))} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
              </label>
            </>
          ) : null}

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">{editingId ? 'Simpan perubahan' : 'Tambah'}</button>
            {editingId ? <button type="button" onClick={resetForm} className="rounded-lg border border-white/10 px-4 py-2">Batal</button> : null}
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <h2 className="mb-4 text-xl font-semibold">Timeline</h2>
        <div className="space-y-3">
          {timeline.map((entry) => (
            <div key={`${entry.kind}-${entry.id}`} className="rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{entry.title}</p>
                  <p className="text-sm text-slate-400">{entry.detail}</p>
                </div>
                <span className="text-sm text-slate-500">{new Date(entry.date).toLocaleDateString('id-ID')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Vaksinasi</h2>
          <ul className="space-y-2">
            {(data?.vaccinations ?? []).map((item) => (
              <li key={item.id} className="rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.vaccineName}</p>
                    <p className="text-sm text-slate-400">{new Date(item.date).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit('vaccination', item)} className="rounded-lg border border-white/10 px-3 py-1">Edit</button>
                    <button type="button" onClick={() => void handleDelete('vaccination', item.id)} className="rounded-lg border border-rose-400/30 px-3 py-1 text-rose-300">Hapus</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Berat badan</h2>
          <ul className="space-y-2">
            {(data?.weights ?? []).map((item) => (
              <li key={item.id} className="rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.weight} kg</p>
                    <p className="text-sm text-slate-400">{new Date(item.date).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit('weight', item)} className="rounded-lg border border-white/10 px-3 py-1">Edit</button>
                    <button type="button" onClick={() => void handleDelete('weight', item.id)} className="rounded-lg border border-rose-400/30 px-3 py-1 text-rose-300">Hapus</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Alergi</h2>
          <ul className="space-y-2">
            {(data?.allergies ?? []).map((item) => (
              <li key={item.id} className="rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.allergen}</p>
                    <p className="text-sm text-slate-400">{item.severity ?? '-'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit('allergy', item)} className="rounded-lg border border-white/10 px-3 py-1">Edit</button>
                    <button type="button" onClick={() => void handleDelete('allergy', item.id)} className="rounded-lg border border-rose-400/30 px-3 py-1 text-rose-300">Hapus</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">Riwayat penyakit</h2>
          <ul className="space-y-2">
            {(data?.diseases ?? []).map((item) => (
              <li key={item.id} className="rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.diseaseName}</p>
                    <p className="text-sm text-slate-400">{item.status ?? '-'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit('disease', item)} className="rounded-lg border border-white/10 px-3 py-1">Edit</button>
                    <button type="button" onClick={() => void handleDelete('disease', item.id)} className="rounded-lg border border-rose-400/30 px-3 py-1 text-rose-300">Hapus</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-white/10 bg-slate-900 p-6 md:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Lampiran</h2>
          <ul className="space-y-2">
            {(data?.attachments ?? []).map((item) => (
              <li key={item.id} className="rounded-lg border border-white/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.fileName}</p>
                    <p className="text-sm text-slate-400">{item.mimeType}</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit('attachment', item)} className="rounded-lg border border-white/10 px-3 py-1">Edit</button>
                    <button type="button" onClick={() => void handleDelete('attachment', item.id)} className="rounded-lg border border-rose-400/30 px-3 py-1 text-rose-300">Hapus</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
