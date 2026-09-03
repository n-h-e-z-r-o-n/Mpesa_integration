type Props = {
  value: string;
};

const toneMap: Record<string, string> = {
  healthy: "border-emerald-800/70 bg-emerald-950/55 text-emerald-300",
  success: "border-emerald-800/70 bg-emerald-950/55 text-emerald-300",
  succeeded: "border-emerald-800/70 bg-emerald-950/55 text-emerald-300",
  accepted: "border-sky-800/70 bg-sky-950/55 text-sky-300",
  pending: "border-amber-800/70 bg-amber-950/55 text-amber-300",
  degraded: "border-amber-800/70 bg-amber-950/55 text-amber-300",
  warning: "border-amber-800/70 bg-amber-950/55 text-amber-300",
  failed: "border-rose-800/70 bg-rose-950/55 text-rose-300",
  down: "border-rose-800/70 bg-rose-950/55 text-rose-300",
  danger: "border-rose-800/70 bg-rose-950/55 text-rose-300",
  rejected: "border-rose-800/70 bg-rose-950/55 text-rose-300",
  timeout: "border-orange-800/70 bg-orange-950/55 text-orange-300",
  cancelled: "border-zinc-700/70 bg-zinc-900/80 text-zinc-300",
  sandbox: "border-slate-700/70 bg-slate-900/80 text-slate-200",
  production: "border-violet-800/70 bg-violet-950/55 text-violet-300",
  live: "border-violet-800/70 bg-violet-950/55 text-violet-300",
};

export function StatusBadge({ value }: Props) {
  const tone = toneMap[value] ?? "border-slate-700 bg-slate-900/80 text-slate-200";
  const label = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2");

  return (
    <span
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${tone}`}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      <span className="truncate">{label}</span>
    </span>
  );
}
