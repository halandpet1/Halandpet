import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-slate-100">
      <h2 className="text-2xl font-semibold">Halaman tidak ditemukan</h2>
      <p className="max-w-md text-sm text-slate-300">Halaman yang Anda cari tidak tersedia atau telah dipindahkan.</p>
      <Link href="/dashboard" className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-500">
        Kembali ke dashboard
      </Link>
    </div>
  );
}
