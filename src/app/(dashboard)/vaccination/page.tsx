import { ModulePageShell } from '@/components/module-page-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VaccinationPage() {
  return (
    <ModulePageShell title="Vaccination" description="Kelola jadwal vaksin, reminder, dan status penyelesaian imunisasi." badge="Clinical Module">
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Upcoming reminder</CardTitle>
            <CardDescription>Vaksin yang akan datang dalam 7 hari ke depan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['Luna - rabies', 'Bobo - DHLPP', 'Piko - FVRCP'].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">{item}</div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-slate-800/80 bg-slate-900/70">
          <CardHeader>
            <CardTitle>Completed today</CardTitle>
            <CardDescription>Jadwal vaksin yang sudah selesai diproses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {['Milo - vaksin booster', 'Coco - vaksin rutin'].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">{item}</div>
            ))}
          </CardContent>
        </Card>
      </div>
    </ModulePageShell>
  );
}
