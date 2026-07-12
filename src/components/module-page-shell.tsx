import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

type ModulePageShellProps = {
  title: string;
  description: string;
  badge: string;
  children: React.ReactNode;
};

export function ModulePageShell({ title, description, badge, children }: ModulePageShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-800/90 bg-slate-900/70 p-6 shadow-[0_20px_60px_rgba(2,6,23,0.35)]">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-sky-400/20 bg-sky-500/10 text-sky-300">{badge}</Badge>
          <Badge variant="outline" className="border-slate-700 text-slate-300">Module</Badge>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Module</p>
            <h1 className="text-3xl font-semibold text-white">{title}</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-400">
            <Sparkles className="h-4 w-4 text-sky-300" />
            <span>{description}</span>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
