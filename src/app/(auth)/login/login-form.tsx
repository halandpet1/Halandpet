'use client';

import { useState } from 'react';
import { loginAction } from '@/actions/auth.actions';

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await loginAction(formData);

    if (!result.success) {
      setError(result.error);
      setPending(false);
      return;
    }

    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-2 block">Username</span>
        <input
          name="username"
          className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-4 py-3 outline-none ring-0"
          placeholder="admin_john"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-2 block">PIN</span>
        <input
          name="pin"
          type="password"
          inputMode="numeric"
          className="w-full rounded-lg border border-white/15 bg-slate-900/70 px-4 py-3 outline-none ring-0"
          placeholder="123456"
        />
      </label>
      {error ? <p className="text-sm text-rose-400">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Memproses...' : 'Masuk'}
      </button>
    </form>
  );
}
