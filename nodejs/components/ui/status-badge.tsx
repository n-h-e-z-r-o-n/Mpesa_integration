type Props = {
  value: string;
};

const toneMap: Record<string, string> = {
  healthy: "border-emerald-700/60 bg-emerald-950/70 text-emerald-300",
  succeeded: "border-emerald-700/60 bg-emerald-950/70 text-emerald-300",
  accepted: "border-sky-700/60 bg-sky-950/70 text-sky-300",
  pending: "border-amber-700/60 bg-amber-950/70 text-amber-300",
  degraded: "border-amber-700/60 bg-amber-950/70 text-amber-300",
  failed: "border-rose-700/60 bg-rose-950/70 text-rose-300",
  timeout: "border-orange-700/60 bg-orange-950/70 text-orange-300",
  cancelled: "border-zinc-700/60 bg-zinc-900/80 text-zinc-300",
};

export function StatusBadge({ value }: Props) {
  const tone = toneMap[value] ?? "border-slate-700 bg-slate-900/80 text-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${tone}`}
    >
      {value}
    </span>
  );
}
