"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { StatusBadge } from "@/components/ui/status-badge";

type NavItem = {
  href: string;
  label: string;
};

const navigation: NavItem[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/workspace", label: "Workspace" },
  { href: "/transactions", label: "Transactions" },
  { href: "/mpesa", label: "M-Pesa" },
  { href: "/applications", label: "Applications" },
  { href: "/api-requests", label: "API Requests" },
  { href: "/webhooks", label: "Webhooks" },
  { href: "/logs", label: "Logs" },
  { href: "/settings", label: "Settings" },
];

type Props = {
  children: React.ReactNode;
  environment: string;
  health: "healthy" | "degraded" | "down";
  adminEmail: string;
};

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ConsoleShell({ children, environment, health, adminEmail }: Props) {
  const pathname = usePathname() ?? "";

  return (
    <div className="console-shell min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] min-w-0">
        <aside className="hidden w-[248px] shrink-0 border-r border-[var(--border)] bg-black/10 xl:block">
          <div className="sticky top-0 flex h-screen flex-col px-5 py-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
                Zadhron.com
              </div>
              <div className="mt-2 text-lg font-semibold tracking-[-0.02em] text-white">
                Payments Console
              </div>
              <div className="mt-2 text-sm text-[var(--text-muted)]">Operations and gateway telemetry</div>
            </div>

            <nav className="mt-8 space-y-1.5">
              {navigation.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-[0.95rem] border px-3.5 py-2.5 text-sm transition ${
                      active
                        ? "border-sky-500/35 bg-sky-500/10 text-white"
                        : "border-transparent text-slate-300 hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto rounded-[1.2rem] border border-[var(--border)] bg-[var(--surface)]/75 p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Gateway</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge value={environment} />
                <StatusBadge value={health} />
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[var(--border)] px-5 py-4 xl:px-8">
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5 text-sm">
                <span className="text-[var(--text-muted)]">Environment</span>
                <StatusBadge value={environment} />
                <span className="text-[var(--text-muted)]">Health</span>
                <StatusBadge value={health} />
              </div>

              <div className="flex min-w-0 flex-wrap items-center gap-3 text-sm">
                <span className="text-[var(--text-muted)]">Admin</span>
                <span className="mono max-w-full truncate text-slate-200">{adminEmail}</span>
                <form action="/api/admin/logout" method="post">
                  <button
                    type="submit"
                    className="rounded-full border border-[var(--border)] px-3 py-2 text-xs uppercase tracking-[0.14em] text-slate-200 transition hover:border-sky-500/35 hover:bg-[var(--surface-2)] hover:text-white"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 py-5 sm:px-5 xl:px-8 xl:py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
