'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await loginAction(formData);

    if (!result.success) {
      setError(result.error ?? 'Login gagal.');
      setPending(false);
      return;
    }

    const redirectTo = result.data?.redirectTo ?? '/dashboard';
    const role = result.data?.role;

    if (role) {
      window.sessionStorage.setItem('haland-role', role);
    }

    setPending(false);
    router.refresh();
    router.replace(redirectTo);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <label className="block text-sm" htmlFor="username">
        <span className="mb-2 block font-medium text-slate-200">Username</span>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          placeholder="admin_john"
          required
          aria-invalid={error ? 'true' : undefined}
        />
      </label>
      <label className="block text-sm" htmlFor="pin">
        <span className="mb-2 block font-medium text-slate-200">PIN</span>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          placeholder="123456"
          required
          minLength={4}
          aria-invalid={error ? 'true' : undefined}
        />
      </label>
      {error ? <p className="text-sm text-rose-400" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? 'Memproses...' : 'Masuk'}
      </Button>
    </form>
  );
}
