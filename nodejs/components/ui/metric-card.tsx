type Props = {
  label: string;
  value: string | number;
  hint: string;
};

export function MetricCard({ label, value, hint }: Props) {
  return (
    <div className="panel rounded-sm p-4">
      <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-sm text-[var(--text-muted)]">{hint}</div>
    </div>
  );
}
