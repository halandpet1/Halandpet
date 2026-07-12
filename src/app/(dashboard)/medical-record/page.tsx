import Link from 'next/link';
import { ModulePageShell } from '@/components/module-page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function MedicalRecordPage() {
  return (
    <ModulePageShell title="Medical Record" description="Pantau rekam medis, pemeriksaan, dan perkembangan pasien dari satu tempat yang konsisten." badge="Clinical Module">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardContent className="p-5">
            <p className="text-sm text-slate-400">Today patient</p>
            <p className="mt-2 text-2xl font-semibold text-white">12</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardContent className="p-5">
            <p className="text-sm text-slate-400">Open records</p>
            <p className="mt-2 text-2xl font-semibold text-white">5</p>
          </CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardContent className="p-5">
            <p className="text-sm text-slate-400">Need follow-up</p>
            <p className="mt-2 text-2xl font-semibold text-white">3</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Recent cases</CardTitle>
            <CardDescription>Daftar rekam medis yang terakhir diakses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['Kucing Luna - pemeriksaan rutin', 'Anjing Bobo - follow-up terapi', 'Kelinci Piko - vaksin'].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">{item}</div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>Shortcut ke submodul terkait.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { href: '/clinical', label: 'Queue' },
              { href: '/prescription', label: 'Prescription' },
              { href: '/vaccination', label: 'Vaccination' },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-300 hover:text-white">
                <span>{link.label}</span>
                <span className="text-slate-500">→</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </ModulePageShell>
  );
}
