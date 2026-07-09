import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-300">HaLand PetCare</p>
          <h1 className="text-3xl font-semibold">Masuk ke sistem</h1>
          <p className="text-sm text-slate-300">Gunakan username dan PIN internal Anda.</p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
