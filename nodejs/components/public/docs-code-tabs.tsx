"use client";

import { Fragment, useMemo, useState } from "react";

export type CodeTab = {
  code: string;
  label: string;
  language: "bash" | "javascript" | "json";
  tone?: "request" | "response" | "webhook";
};

type Props = {
  tabs: CodeTab[];
  title: string;
  description?: string;
};

function classForToken(type: string) {
  switch (type) {
    case "comment":
      return "text-slate-500";
    case "string":
      return "text-emerald-300";
    case "property":
      return "text-sky-300";
    case "number":
      return "text-amber-300";
    case "keyword":
      return "text-fuchsia-300";
    case "boolean":
      return "text-amber-300";
    case "operator":
      return "text-slate-200";
    default:
      return "text-slate-100";
  }
}

function tokenizeJson(line: string) {
  const pattern =
    /("(?:\\.|[^"])*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  const parts: Array<{ text: string; type: string }> = [];
  let lastIndex = 0;

  for (const match of line.matchAll(pattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ text: line.slice(lastIndex, index), type: "plain" });
    }

    if (match[2]) {
      parts.push({ text: match[1] ?? token, type: "property" });
      parts.push({ text: match[2], type: "plain" });
    } else if (match[1]) {
      parts.push({ text: token, type: "string" });
    } else if (match[3]) {
      parts.push({ text: token, type: "boolean" });
    } else {
      parts.push({ text: token, type: "number" });
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < line.length) {
    parts.push({ text: line.slice(lastIndex), type: "plain" });
  }

  return parts;
}

function tokenizeScript(line: string) {
  const pattern =
    /(#.*$|\/\/.*$)|("(?:\\.|[^"])*"|'(?:\\.|[^'])*')|\b(await|const|fetch|return|true|false|null|async|function|new)\b|(-{1,2}[A-Za-z-]+)|\b\d+(?:\.\d+)?\b/g;
  const parts: Array<{ text: string; type: string }> = [];
  let lastIndex = 0;

  for (const match of line.matchAll(pattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex) {
      parts.push({ text: line.slice(lastIndex, index), type: "plain" });
    }

    if (match[1]) {
      parts.push({ text: token, type: "comment" });
    } else if (match[2]) {
      parts.push({ text: token, type: "string" });
    } else if (match[3]) {
      parts.push({ text: token, type: token === "true" || token === "false" || token === "null" ? "boolean" : "keyword" });
    } else if (match[4]) {
      parts.push({ text: token, type: "operator" });
    } else {
      parts.push({ text: token, type: "number" });
    }

    lastIndex = index + token.length;
  }

  if (lastIndex < line.length) {
    parts.push({ text: line.slice(lastIndex), type: "plain" });
  }

  return parts;
}

function highlight(language: CodeTab["language"], code: string) {
  const lines = code.replace(/\t/g, "  ").split("\n");
  return lines.map((line, index) => {
    const tokens = language === "json" ? tokenizeJson(line) : tokenizeScript(line);
    return (
      <div key={`${language}-${index}`} className="min-h-6">
        {tokens.length ? (
          tokens.map((token, tokenIndex) => (
            <Fragment key={`${index}-${tokenIndex}`}>
              <span className={classForToken(token.type)}>{token.text}</span>
            </Fragment>
          ))
        ) : (
          <span> </span>
        )}
      </div>
    );
  });
}

function toneLabel(tone?: CodeTab["tone"]) {
  switch (tone) {
    case "request":
      return "Request";
    case "response":
      return "Response";
    case "webhook":
      return "Webhook";
    default:
      return null;
  }
}

export function DocsCodeTabs({ tabs, title, description }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeTab = tabs[activeIndex] ?? tabs[0];
  const highlighted = useMemo(
    () => (activeTab ? highlight(activeTab.language, activeTab.code) : null),
    [activeTab],
  );

  async function handleCopy() {
    if (!activeTab) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activeTab.code);
    } catch {
      // Ignore clipboard failures and keep the UI stable.
    }
  }

  if (!activeTab) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-slate-800 bg-[#0b1220] shadow-[0_16px_40px_rgba(2,8,23,0.28)]">
      <div className="border-b border-white/8 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{title}</div>
            {description ? <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
              {activeTab.language}
            </span>
            {toneLabel(activeTab.tone) ? (
              <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-sky-200">
                {toneLabel(activeTab.tone)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full border border-white/12 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-200 transition hover:bg-white/6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              Copy
            </button>
          </div>
        </div>

        {tabs.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {tabs.map((tab, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={`${tab.label}-${tab.language}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`rounded-full px-3 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
                    isActive
                      ? "bg-white text-slate-950"
                      : "border border-white/10 text-slate-300 hover:bg-white/6"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="thin-scrollbar overflow-x-auto px-5 py-5">
        <pre className="mono min-w-max text-sm leading-7">{highlighted}</pre>
      </div>
    </div>
  );
}
