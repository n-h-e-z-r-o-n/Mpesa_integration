"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

export type DocsSidebarSection = {
  id: string;
  title: string;
  items: Array<{
    id?: string;
    label: string;
    planned?: boolean;
    children?: Array<{
      id: string;
      label: string;
      planned?: boolean;
    }>;
  }>;
};

export type DocsTocItem = {
  id: string;
  label: string;
  level: 2 | 3;
};

type Props = {
  children: ReactNode;
  sidebar: DocsSidebarSection[];
  toc: DocsTocItem[];
};

function flattenSidebarIds(sidebar: DocsSidebarSection[]) {
  return sidebar.flatMap((section) =>
    section.items.flatMap((item) =>
      item.children?.length ? item.children.map((child) => child.id) : item.id ? [item.id] : [],
    ),
  );
}

export function DeveloperDocsShell({ children, sidebar, toc }: Props) {
  const [activeId, setActiveId] = useState(toc[0]?.id ?? "");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sidebar.map((section) => [section.id, true])),
  );
  const sidebarIds = useMemo(() => flattenSidebarIds(sidebar), [sidebar]);

  useEffect(() => {
    const headingIds = toc.map((item) => item.id);
    const headings = headingIds
      .map((id) => document.getElementById(id))
      .filter((item): item is HTMLElement => Boolean(item));

    if (!headings.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => {
            const leftTop = (left.target as HTMLElement).getBoundingClientRect().top;
            const rightTop = (right.target as HTMLElement).getBoundingClientRect().top;
            return leftTop - rightTop;
          });

        if (visibleEntries[0]?.target.id) {
          setActiveId(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: "-120px 0px -55% 0px",
        threshold: [0, 0.25, 1],
      },
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [toc]);

  useEffect(() => {
    function syncHash() {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        setActiveId(hash);
      }
    }

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  function toggleSection(id: string) {
    setOpenSections((current) => ({
      ...current,
      [id]: !current[id],
    }));
  }

  function closeOverlays() {
    setMobileSidebarOpen(false);
  }

  function isItemActive(id?: string, children?: Array<{ id: string }>) {
    if (id && activeId === id) {
      return true;
    }

    return Boolean(children?.some((child) => child.id === activeId));
  }

  function renderSidebar() {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.8rem] border border-[#1d3047] bg-[#0b1625] p-5 text-white shadow-[0_20px_50px_rgba(6,15,27,0.32)]">
          <div className="text-[11px] uppercase tracking-[0.22em] text-sky-200/80">Documentation map</div>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            Browse the gateway by integration phase instead of scanning one long page.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-3 py-3">
              <div className="mono text-lg text-white">{sidebar.length}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">Sections</div>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-3 py-3">
              <div className="mono text-lg text-white">{sidebarIds.length}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">Anchors</div>
            </div>
          </div>
        </div>
        {sidebar.map((section) => {
          const isOpen = openSections[section.id] ?? true;
          return (
            <section
              key={section.id}
              className="rounded-[1.5rem] border border-slate-200/80 bg-white/88 shadow-[0_18px_45px_rgba(15,23,42,0.06)] backdrop-blur"
            >
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {section.title}
                </span>
                <span className="mono text-xs text-slate-400">{isOpen ? "01" : "00"}</span>
              </button>

              {isOpen ? (
                <div className="border-t border-slate-200/80 px-2 py-2.5">
                  {section.items.map((item) => {
                    const active = isItemActive(item.id, item.children);
                    return (
                      <div key={`${section.id}-${item.label}`} className="py-1">
                        {item.id ? (
                          <a
                            href={`#${item.id}`}
                            onClick={closeOverlays}
                            style={active ? { color: "#ffffff" } : undefined}
                            className={`flex items-center justify-between rounded-[1.15rem] px-3 py-2.5 text-sm transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                              active
                                ? "bg-[linear-gradient(135deg,#0b1b31_0%,#102948_100%)] text-white shadow-[0_14px_30px_rgba(13,28,49,0.24)]"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 hover:translate-x-[2px]"
                            }`}
                          >
                            <span>{item.label}</span>
                            {item.planned ? (
                              <span className="rounded-full border border-current/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
                                Planned
                              </span>
                            ) : null}
                          </a>
                        ) : (
                          <div className="px-3 py-2 text-sm font-medium text-slate-950">{item.label}</div>
                        )}

                        {item.children?.length ? (
                          <div className="mt-1.5 space-y-1.5 pl-3">
                            {item.children.map((child) => {
                              const childActive = activeId === child.id;
                              return (
                                <a
                                  key={child.id}
                                  href={`#${child.id}`}
                                  onClick={closeOverlays}
                                  style={childActive ? { color: "#08213a" } : undefined}
                                  className={`flex items-center justify-between rounded-[1.05rem] px-3 py-2 text-sm transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${
                                    childActive
                                      ? "bg-sky-50 text-sky-950 ring-1 ring-sky-100"
                                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 hover:translate-x-[2px]"
                                  }`}
                                >
                                  <span>{child.label}</span>
                                  {child.planned ? (
                                    <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                                      Planned
                                    </span>
                                  ) : null}
                                </a>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-[1540px]">
        <div className="mb-6 flex flex-wrap items-center gap-3 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="rounded-full border border-slate-300/90 bg-white/95 px-4 py-2 text-sm font-medium text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            Browse docs
          </button>
          <div className="rounded-full border border-slate-200/90 bg-white/90 px-4 py-2 text-sm text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            Active section:
            {" "}
            <span className="font-medium text-slate-950">
              {toc.find((item) => item.id === activeId)?.label ?? sidebarIds.find((id) => id === activeId) ?? "Docs"}
            </span>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[298px_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 thin-scrollbar">
              {renderSidebar()}
            </div>
          </aside>

          <div className="min-w-0">{children}</div>
        </div>
      </div>

      {mobileSidebarOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/55 p-4 xl:hidden">
          <div className="ml-auto h-full max-w-sm overflow-y-auto rounded-[1.9rem] border border-white/15 bg-[#f4f7fb] p-4 shadow-[0_30px_80px_rgba(15,23,42,0.35)]">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold text-slate-950">Documentation</div>
              <button
                type="button"
                onClick={closeOverlays}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
              >
                Close
              </button>
            </div>
            {renderSidebar()}
          </div>
        </div>
      ) : null}
    </div>
  );
}
