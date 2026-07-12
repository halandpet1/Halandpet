import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type MetricItem = {
  label: string;
  value: string;
  icon?: LucideIcon;
  tone?: 'sky' | 'emerald' | 'violet' | 'amber' | 'rose';
};

const toneClasses: Record<NonNullable<MetricItem['tone']>, string> = {
  sky: 'border-sky-400/20 bg-sky-500/10 text-sky-300',
  emerald: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  violet: 'border-violet-400/20 bg-violet-500/10 text-violet-300',
  amber: 'border-amber-400/20 bg-amber-500/10 text-amber-300',
  rose: 'border-rose-400/20 bg-rose-500/10 text-rose-300',
};

export function ModuleMetricCards({ items }: { items: MetricItem[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="border-slate-800/80 bg-slate-900/70 shadow-[0_12px_40px_rgba(2,6,23,0.25)]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                </div>
                {Icon ? (
                  <div className={`rounded-2xl border p-2 ${item.tone ? toneClasses[item.tone] : 'border-slate-700 bg-slate-950/70 text-slate-300'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

type InfoListCardProps = {
  title: string;
  description: string;
  items: string[];
  icon?: LucideIcon;
  className?: string;
};

export function ModuleInfoListCard({ title, description, items, icon: Icon, className }: InfoListCardProps) {
  return (
    <Card className={`border-slate-800/80 bg-slate-900/70 shadow-[0_12px_40px_rgba(2,6,23,0.25)] ${className ?? ''}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          {Icon ? (
            <div className="rounded-2xl border border-sky-400/20 bg-sky-500/10 p-2 text-sky-300">
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-sm text-slate-300">{item}</div>
        ))}
      </CardContent>
    </Card>
  );
}
