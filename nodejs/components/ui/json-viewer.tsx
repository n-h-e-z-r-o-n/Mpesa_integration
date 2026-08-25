type Props = {
  value: unknown;
};

export function JsonViewer({ value }: Props) {
  return (
    <pre className="thin-scrollbar overflow-auto rounded-sm border border-[var(--border)] bg-[#0a0f15] p-4 text-xs leading-6 text-slate-200">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
