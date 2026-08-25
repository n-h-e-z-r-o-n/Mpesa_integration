"use client";

import { useState } from "react";

type Props = {
  value?: string;
};

export function CopyableIdentifier({ value }: Props) {
  const [copied, setCopied] = useState(false);

  if (!value) {
    return <span className="text-[var(--text-muted)]">n/a</span>;
  }

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1000);
      }}
      className="mono inline-flex items-center gap-2 text-left text-xs text-slate-200 hover:text-white"
    >
      <span>{value}</span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {copied ? "copied" : "copy"}
      </span>
    </button>
  );
}
