'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createPet, listPets, listSpecies, softDeletePet } from '@/actions/customer.actions';

type PetItem = {
  id: string;
  name: string;
  customer?: { name?: string | null } | null;
  species?: { name?: string | null } | null;
};

type SpeciesItem = {
  id: string;
  name: string;
};

export function PetManagementClient() {
  const [pets, setPets] = useState<PetItem[]>([]);
  const [species, setSpecies] = useState<SpeciesItem[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [name, setName] = useState('');
  const [speciesId, setSpeciesId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [speciesResult, petsResult] = await Promise.all([listSpecies(), listPets({ search, page, pageSize })]);
    if (speciesResult.success) setSpecies((speciesResult.data ?? []) as SpeciesItem[]);
    if (petsResult.success) {
      setPets((petsResult.data?.items ?? []) as PetItem[]);
      setTotal(petsResult.data?.total ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, search]);

  useEffect(() => {
    void (async () => {
      await loadData();
    })();
  }, [loadData]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const result = await createPet({ customerId, name, speciesId, gender: 'UNKNOWN' });
    if (result.success) {
      setMessage('Hewan berhasil dibuat');
      setCustomerId('');
      setName('');
      setSpeciesId('');
      await loadData();
      return;
    }
    setError(result.error);
  }

  async function handleDelete(id: string) {
    const result = await softDeletePet(id);
    if (result.success) {
      await loadData();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Pet</p>
        <h1 className="text-3xl font-semibold">Manajemen hewan</h1>
      </div>

      <form onSubmit={handleCreate} className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-2 block">Customer ID</span>
          <input value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-2 block">Nama hewan</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-2 block">Spesies</span>
          <select value={speciesId} onChange={(event) => setSpeciesId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
            <option value="">Pilih spesies</option>
            {species.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2">
          <button className="rounded-lg bg-blue-600 px-4 py-2">Tambah hewan</button>
          {message ? <span className="ml-4 text-sm text-emerald-400">{message}</span> : null}
          {error ? <span className="ml-4 text-sm text-rose-400">{error}</span> : null}
        </div>
      </form>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau mikrochip" className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 md:max-w-sm" />
          <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} className="rounded-lg border border-white/10 bg-slate-950 px-3 py-2">
            <option value={10}>10 per halaman</option>
            <option value={20}>20 per halaman</option>
          </select>
        </div>
        {loading ? <div>Memuat...</div> : null}
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800 text-left text-slate-300">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Pemilik</th>
                <th className="px-4 py-3">Spesies</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pets.map((pet) => (
                <tr key={pet.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{pet.name}</td>
                  <td className="px-4 py-3">{pet.customer?.name ?? '-'}</td>
                  <td className="px-4 py-3">{pet.species?.name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/pets/${pet.id}`} className="rounded-lg border border-white/10 px-3 py-1 text-slate-200">Detail</Link>
                      <button onClick={() => void handleDelete(pet.id)} className="rounded-lg border border-rose-500/30 px-3 py-1 text-rose-300">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-slate-400">Total: {total}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40">Sebelumnya</button>
            <button disabled={page * pageSize >= total} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40">Berikutnya</button>
          </div>
        </div>
      </div>
    </div>
  );
}
