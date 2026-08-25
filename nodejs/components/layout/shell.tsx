import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";

type NavItem = {
  href: string;
  label: string;
};

const navigation: NavItem[] = [
  { href: "/dashboard", label: "Overview" },
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

export function ConsoleShell({ children, environment, health, adminEmail }: Props) {
  return (
    <div className="console-shell min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="w-[240px] border-r border-[var(--border)] px-5 py-6">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--text-muted)]">
              Zadhron.com
            </div>
            <div className="mt-2 text-lg font-semibold text-white">Payments Console</div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">
              Centralized gateway operations
            </div>
          </div>

          <nav className="mt-8 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-sm border border-transparent px-3 py-2 text-sm text-slate-200 transition hover:border-[var(--border)] hover:bg-[var(--surface-2)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-[var(--border)] px-8 py-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-[var(--text-muted)]">Environment</span>
              <StatusBadge value={environment} />
              <span className="text-[var(--text-muted)]">Gateway Health</span>
              <StatusBadge value={health} />
            </div>

            <div className="flex items-center gap-3 text-sm">
              <span className="text-[var(--text-muted)]">Administrator</span>
              <span className="mono text-slate-200">{adminEmail}</span>
              <form action="/api/admin/logout" method="post">
                <button
                  type="submit"
                  className="rounded-sm border border-[var(--border)] px-3 py-2 text-xs uppercase tracking-[0.14em] text-slate-200 hover:bg-[var(--surface-2)]"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </header>

          <main className="flex-1 px-8 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
