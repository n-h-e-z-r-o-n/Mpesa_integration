type Props = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  emphasis?: "default" | "hero";
};

const toneClassMap = {
  neutral: "border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_92%,black_8%)]",
  success: "border-emerald-900/60 bg-emerald-950/24",
  warning: "border-amber-900/60 bg-amber-950/24",
  danger: "border-rose-900/60 bg-rose-950/24",
  info: "border-sky-900/60 bg-sky-950/24",
} as const;

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  emphasis = "default",
}: Props) {
  return (
    <div
      className={`min-w-0 rounded-[1.35rem] border p-5 shadow-[0_16px_44px_rgba(0,0,0,0.14)] ${toneClassMap[tone]}`}
    >
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
      <div
        className={`mt-4 truncate font-semibold tracking-[-0.04em] text-white ${
          emphasis === "hero" ? "text-[1.9rem]" : "text-3xl"
        }`}
      >
        {value}
      </div>
      {hint ? <div className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{hint}</div> : null}
    </div>
  );
}
