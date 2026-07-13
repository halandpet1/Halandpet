'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-slate-100">
      <h2 className="text-2xl font-semibold">Terjadi masalah</h2>
      <p className="max-w-md text-sm text-slate-300">{error.message || 'Aplikasi mengalami gangguan. Silakan coba lagi atau kembali ke dashboard.'}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500"
      >
        Coba lagi
      </button>
    </div>
  );
}
