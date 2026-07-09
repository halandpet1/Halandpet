'use client';

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-950/30 p-6 text-rose-200">
      <p className="font-semibold">Gagal memuat hewan.</p>
      <button onClick={() => reset()} className="mt-3 rounded-lg border border-rose-500/30 px-3 py-2">Coba lagi</button>
    </div>
  );
}
