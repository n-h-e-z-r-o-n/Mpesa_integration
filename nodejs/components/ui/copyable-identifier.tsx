"use client";

import { useState } from "react";

type Props = {
  value?: string;
  truncate?: boolean;
};

export function CopyableIdentifier({ value, truncate = true }: Props) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <span className="text-[var(--text-muted)]">n/a</span>;
  }

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1000);
        } catch {
          setCopied(false);
        }
      }}
      className="group inline-flex max-w-full items-center gap-2 rounded-md border border-transparent px-1.5 py-1 text-left transition hover:border-[var(--border)] hover:bg-white/4"
    >
      <span className={`mono text-xs text-slate-200 ${truncate ? "truncate" : ""}`}>{value}</span>
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface-2)]">
        <span className="relative h-2.5 w-2.5">
          <span className="absolute inset-x-0 bottom-0 right-0 h-2.5 w-2.5 rounded-[2px] border border-current text-slate-300" />
          <span className="absolute left-[-3px] top-[-3px] h-2.5 w-2.5 rounded-[2px] border border-current bg-[var(--surface-2)] text-slate-300" />
        </span>
      </span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {copied ? "Copied" : "ID"}
      </span>
    </button>
  );
}
