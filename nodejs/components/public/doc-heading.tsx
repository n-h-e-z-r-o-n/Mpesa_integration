"use client";

import type { ReactNode } from "react";
import { useState } from "react";

type Props = {
  as?: "h2" | "h3";
  children: ReactNode;
  id: string;
  className?: string;
};

export function DocHeading({ as = "h2", children, id, className = "" }: Props) {
  const [copied, setCopied] = useState(false);
  const Heading = as;

  async function handleCopy() {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.hash = id;

    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.location.hash = id;
    }
  }

  return (
    <Heading
      id={id}
      data-doc-heading="true"
      data-doc-level={as === "h2" ? "2" : "3"}
      className={`group scroll-mt-32 text-slate-950 ${className}`}
    >
      <span className="inline-flex flex-wrap items-center gap-2.5">
        <span className="min-w-0">{children}</span>
        <a
          href={`#${id}`}
          aria-label={`Jump to ${typeof children === "string" ? children : "section"}`}
          className="mono rounded-full border border-slate-300/90 bg-white/85 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 opacity-0 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          Link
        </a>
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-full border border-slate-300/90 bg-white/85 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 opacity-0 shadow-[0_8px_18px_rgba(15,23,42,0.06)] transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </span>
    </Heading>
  );
}
