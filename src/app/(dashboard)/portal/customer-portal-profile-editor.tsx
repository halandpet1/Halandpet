'use client';

import { useState } from 'react';
import { updateCustomerPortalProfile } from '@/actions/portal.actions';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type CustomerPortalCustomer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export default function CustomerPortalProfileEditor({ customer }: { customer: CustomerPortalCustomer }) {
  const [form, setForm] = useState({
    name: customer.name ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);

    const result = await updateCustomerPortalProfile(form);
    setIsSaving(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    setMessage('Profil berhasil diperbarui');
  }

  return (
    <Card className="border-slate-800/80 bg-slate-900/70">
      <CardHeader>
        <div>
          <CardTitle>Profil Pelanggan</CardTitle>
          <CardDescription>Perbarui detail kontak dan alamat Anda.</CardDescription>
        </div>
        <Badge variant="outline" className="border-slate-700 text-slate-300">Akun</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-2 block">Nama</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
              placeholder="Nama lengkap"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Telepon</span>
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
              placeholder="08xxxxxxxxxx"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
              placeholder="nama@domain.com"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">Alamat</span>
            <textarea
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-2"
              rows={3}
              placeholder="Alamat lengkap"
            />
          </label>
          <button type="submit" className="rounded-lg bg-blue-600 px-4 py-3 font-semibold disabled:opacity-60" disabled={isSaving}>
            {isSaving ? 'Menyimpan...' : 'Simpan profil'}
          </button>
          {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
