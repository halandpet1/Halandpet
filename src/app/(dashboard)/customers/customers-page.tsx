'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { createCustomer, listCustomers, softDeleteCustomer } from '@/actions/customer.actions';

type CustomerItem = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export function CustomersPageClient() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const result = await listCustomers({ search, page, pageSize });
    if (result.success) {
      setCustomers((result.data?.items ?? []) as CustomerItem[]);
      setTotal(result.data?.total ?? 0);
    }
    setLoading(false);
  }, [page, pageSize, search]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      await loadCustomers();
    })();
    return () => controller.abort();
  }, [loadCustomers]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setFieldErrors({});
    const result = await createCustomer({ name, phone, email, address, notes, isWalkIn: false });
    if (result.success) {
      setMessage('Customer berhasil dibuat');
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
      await loadCustomers();
      return;
    }
    setError(result.error);
    setFieldErrors(result.fieldErrors ?? {});
  }

  async function handleDelete(id: string) {
    const result = await softDeleteCustomer(id);
    if (result.success) {
      await loadCustomers();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Customer</p>
          <h1 className="text-3xl font-semibold">Daftar pelanggan</h1>
        </div>
      </div>

      <form onSubmit={handleCreate} className="grid gap-4 rounded-2xl border border-white/10 bg-slate-900 p-6 md:grid-cols-2">
        <label className="block text-sm" htmlFor="customer-name">
          <span className="mb-2 block">Nama</span>
          <input id="customer-name" name="name" value={name} onChange={(event) => setName(event.target.value)} aria-invalid={Boolean(fieldErrors.name?.length)} aria-describedby={fieldErrors.name?.length ? 'customer-name-error' : undefined} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          {fieldErrors.name ? <span id="customer-name-error" className="mt-2 block text-xs text-rose-400">{fieldErrors.name[0]}</span> : null}
        </label>
        <label className="block text-sm" htmlFor="customer-phone">
          <span className="mb-2 block">Telepon</span>
          <input id="customer-phone" name="phone" value={phone} onChange={(event) => setPhone(event.target.value)} aria-invalid={Boolean(fieldErrors.phone?.length)} aria-describedby={fieldErrors.phone?.length ? 'customer-phone-error' : undefined} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          {fieldErrors.phone ? <span id="customer-phone-error" className="mt-2 block text-xs text-rose-400">{fieldErrors.phone[0]}</span> : null}
        </label>
        <label className="block text-sm" htmlFor="customer-email">
          <span className="mb-2 block">Email</span>
          <input id="customer-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={Boolean(fieldErrors.email?.length)} aria-describedby={fieldErrors.email?.length ? 'customer-email-error' : undefined} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          {fieldErrors.email ? <span id="customer-email-error" className="mt-2 block text-xs text-rose-400">{fieldErrors.email[0]}</span> : null}
        </label>
        <label className="block text-sm" htmlFor="customer-address">
          <span className="mb-2 block">Alamat</span>
          <input id="customer-address" name="address" value={address} onChange={(event) => setAddress(event.target.value)} aria-invalid={Boolean(fieldErrors.address?.length)} aria-describedby={fieldErrors.address?.length ? 'customer-address-error' : undefined} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          {fieldErrors.address ? <span id="customer-address-error" className="mt-2 block text-xs text-rose-400">{fieldErrors.address[0]}</span> : null}
        </label>
        <label className="block text-sm md:col-span-2" htmlFor="customer-notes">
          <span className="mb-2 block">Catatan</span>
          <textarea id="customer-notes" name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} aria-invalid={Boolean(fieldErrors.notes?.length)} aria-describedby={fieldErrors.notes?.length ? 'customer-notes-error' : undefined} className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2" />
          {fieldErrors.notes ? <span id="customer-notes-error" className="mt-2 block text-xs text-rose-400">{fieldErrors.notes[0]}</span> : null}
        </label>
        <div className="md:col-span-2">
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2">Tambah customer</button>
          {message ? <span className="ml-4 text-sm text-emerald-400">{message}</span> : null}
          {error ? <span className="ml-4 text-sm text-rose-400">{error}</span> : null}
        </div>
      </form>

      <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, telepon, atau email" className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2 md:max-w-sm" />
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
                <th className="px-4 py-3">Telepon</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-t border-white/10">
                  <td className="px-4 py-3">{customer.name}</td>
                  <td className="px-4 py-3">{customer.phone ?? '-'}</td>
                  <td className="px-4 py-3">{customer.email ?? '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/customers/${customer.id}`} className="rounded-lg border border-white/10 px-3 py-1 text-slate-200">Detail</Link>
                      <button onClick={() => void handleDelete(customer.id)} className="rounded-lg border border-rose-500/30 px-3 py-1 text-rose-300">Hapus</button>
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
            <button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40">Sebelumnya</button>
            <button type="button" disabled={page * pageSize >= total} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40">Berikutnya</button>
          </div>
        </div>
      </div>
    </div>
  );
}
