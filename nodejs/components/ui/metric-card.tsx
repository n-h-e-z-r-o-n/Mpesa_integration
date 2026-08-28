type Props = {
  label: string;
  value: string | number;
  hint: string;
};

export function MetricCard({ label, value, hint }: Props) {
  return (
    <div className="panel rounded-[1.4rem] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</div>
      <div className="mt-3 text-sm leading-6 text-[var(--text-muted)]">{hint}</div>
    </div>
  );
}
