import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";

import { ProviderStatus } from "@/components/dashboard/provider-status";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { listStoredCallbacks } from "@/lib/repositories/callback-store";
import { listStoredRequestLogs } from "@/lib/repositories/telemetry-store";
import { listDatabaseTransactions } from "@/lib/repositories/transaction-store";
import { getGatewayOverview } from "@/services/mpesa/service";
import type { CallbackRecord, RequestLogRecord, TransactionRecord } from "@/types/gateway";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function formatCurrency(amount: number, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatAgeMinutes(value?: number) {
  if (value === undefined) {
    return "Unavailable";
  }

  if (value < 60) {
    return `${value}m`;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function formatDateTime(value?: string) {
  if (!value) {
    return "No data";
  }

  return new Intl.DateTimeFormat("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatOperationLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function getOverviewHeadline(
  health: "healthy" | "degraded" | "down",
  pendingTransactions: number,
  failedRequests: number,
) {
  if (health === "down") {
    return "Gateway disruption";
  }

  if (health === "degraded") {
    return "Gateway under watch";
  }

  if (pendingTransactions > 0 || failedRequests > 0) {
    return "Gateway stable with follow-up";
  }

  return "Gateway stable";
}

function getOverviewSummary(
  health: "healthy" | "degraded" | "down",
  pendingTransactions: number,
  failedRequests: number,
  slowRequests: number,
) {
  if (health === "down") {
    return "Provider traffic is failing. Prioritize request errors and callback recovery.";
  }

  if (health === "degraded") {
    return "Traffic is moving with elevated risk. Watch latency, failed requests, and pending callbacks.";
  }

  if (failedRequests > 0 || slowRequests > 0) {
    return "Core services are up. Review the live queue and recent request anomalies.";
  }

  if (pendingTransactions > 0) {
    return "Core services are healthy. Pending items need confirmation or callback follow-up.";
  }

  return "Core services are healthy. No active issues are surfacing in recent telemetry.";
}

function getSignalTone(value: number, zeroTone: "success" | "neutral" = "neutral") {
  if (value <= 0) {
    return zeroTone;
  }

  if (value >= 10) {
    return "danger";
  }

  if (value >= 3) {
    return "warning";
  }

  return "warning";
}

type SectionHeadingProps = {
  title: string;
  detail?: string;
  actionHref?: string;
  actionLabel?: string;
};

function SectionHeading({ title, detail, actionHref, actionLabel }: SectionHeadingProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-white">{title}</h2>
        {detail ? <p className="mt-1 text-sm text-[var(--text-muted)]">{detail}</p> : null}
      </div>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-slate-200 transition hover:border-sky-500/45 hover:text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

type CompactSignalProps = {
  label: string;
  value: string | number;
  note: string;
  tone?: "neutral" | "success" | "warning" | "danger";
};

function CompactSignal({ label, value, note, tone = "neutral" }: CompactSignalProps) {
  const toneClasses = {
    neutral: "border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_88%,black_12%)]",
    success: "border-emerald-900/60 bg-emerald-950/30",
    warning: "border-amber-900/60 bg-amber-950/30",
    danger: "border-rose-900/60 bg-rose-950/30",
  }[tone];

  return (
    <div className={`min-w-0 rounded-[1.2rem] border px-4 py-4 ${toneClasses}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">{value}</div>
      <div className="mt-1 truncate text-sm text-[var(--text-muted)]">{note}</div>
    </div>
  );
}

export default async function DashboardPage() {
  noStore();

  const [overview, storedCallbacks, storedTransactions, storedRequestLogs] = await Promise.all([
    getGatewayOverview(),
    listStoredCallbacks(25).catch(() => null),
    listDatabaseTransactions(50).catch(() => null),
    listStoredRequestLogs(25).catch(() => null),
  ]);

  const callbacks: CallbackRecord[] = storedCallbacks ?? [];
  const allTransactions: TransactionRecord[] = storedTransactions ?? [];
  const allRequestLogs: RequestLogRecord[] = storedRequestLogs ?? [];
  const transactions = allTransactions.slice(0, 6);
  const requestLogs = allRequestLogs.slice(0, 7);

  const totalTransactions =
    allTransactions.length ||
    (overview.transactions.pending + overview.transactions.succeeded + overview.transactions.failed);
  const successfulTransactions = overview.transactions.succeeded;
  const successRate = totalTransactions ? (successfulTransactions / totalTransactions) * 100 : 0;
  const pendingTransactions = overview.transactions.pending + overview.transactions.accepted;
  const failedRequests = overview.failedRequestCount;
  const slowRequests = overview.slowRequestCount;
  const shortcodeBalanceValue =
    overview.shortcodeBalance.status === "available"
      ? formatCurrency(
          overview.shortcodeBalance.totalCurrent ?? overview.shortcodeBalance.totalAvailable ?? 0,
          overview.shortcodeBalance.currency,
        )
      : "Unavailable";
  const balanceFreshness = formatAgeMinutes(overview.balanceFreshnessMinutes);
  const headline = getOverviewHeadline(overview.providerHealth, pendingTransactions, failedRequests);
  const summary = getOverviewSummary(
    overview.providerHealth,
    pendingTransactions,
    failedRequests,
    slowRequests,
  );
  const mostRecentTransaction = allTransactions[0];
  const latestCallback = callbacks[0];
  const latestRequest = requestLogs[0];
  const operationMix = Object.entries(
    allTransactions.reduce<Record<string, number>>((accumulator, transaction) => {
      accumulator[transaction.operation] = (accumulator[transaction.operation] ?? 0) + 1;
      return accumulator;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);
  const watchlist = [
    {
      label: "Pending queue",
      value: pendingTransactions,
      note: pendingTransactions ? "Awaiting provider confirmation" : "No open items",
      tone: getSignalTone(pendingTransactions, "success"),
    },
    {
      label: "Failed requests",
      value: failedRequests,
      note: failedRequests ? "Recent 4xx and 5xx traffic" : "No recent request failures",
      tone: getSignalTone(failedRequests, "success"),
    },
    {
      label: "Slow requests",
      value: slowRequests,
      note: slowRequests ? "Latency at or above 1s" : "Latency is within target",
      tone: getSignalTone(slowRequests, "success"),
    },
    {
      label: "Balance freshness",
      value: balanceFreshness,
      note:
        overview.balanceFreshnessMinutes === undefined
          ? "No balance callback stored"
          : `Updated ${formatDateTime(overview.shortcodeBalance.updatedAt)}`,
      tone:
        overview.balanceFreshnessMinutes === undefined
          ? "warning"
          : overview.balanceFreshnessMinutes > 120
            ? "warning"
            : "success",
    },
    {
      label: "Active apps",
      value: overview.activeApplicationCount,
      note: "Distinct gateway clients",
      tone: "neutral" as const,
    },
  ];
  const activityFeed = [
    mostRecentTransaction
      ? {
          id: `transaction-${mostRecentTransaction.id}`,
          title: `${formatOperationLabel(mostRecentTransaction.operation)} ${mostRecentTransaction.status}`,
          meta: mostRecentTransaction.applicationId,
          timestamp: mostRecentTransaction.updatedAt,
          tone: mostRecentTransaction.status,
        }
      : null,
    latestCallback
      ? {
          id: `callback-${latestCallback.id}`,
          title: `${formatOperationLabel(latestCallback.callbackName)} callback`,
          meta: latestCallback.sourceIp ?? "Safaricom",
          timestamp: latestCallback.receivedAt,
          tone: latestCallback.processingStatus,
        }
      : null,
    latestRequest
      ? {
          id: `request-${latestRequest.id}`,
          title: `${formatOperationLabel(latestRequest.operation)} ${latestRequest.status >= 400 ? "failed" : "completed"}`,
          meta: `${latestRequest.method} ${latestRequest.route}`,
          timestamp: latestRequest.timestamp,
          tone: latestRequest.status >= 400 ? "failed" : latestRequest.providerStatus ?? "healthy",
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    title: string;
    meta: string;
    timestamp: string;
    tone: string;
  }>;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] min-w-0 flex-col gap-6">
      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <div className="min-w-0 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(91,163,255,0.18),transparent_34%),linear-gradient(160deg,#0e1624_0%,#0a111b_52%,#080d15_100%)] p-6 shadow-[0_28px_70px_rgba(0,0,0,0.24)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full border border-sky-300/20 bg-sky-300/8 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-200">
                Admin Console
              </span>
              <StatusBadge value={overview.providerHealth} />
              <StatusBadge value={overview.environment} />
            </div>
            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
              Sync {formatDateTime(overview.projectionUpdatedAt)}
            </div>
          </div>

          <div className="mt-6 max-w-3xl">
            <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">{headline}</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-[2.7rem]">
              Gateway operations at a glance.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">{summary}</p>
          </div>

          <div className="mt-7 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Shortcode balance"
              value={shortcodeBalanceValue}
              hint={
                overview.shortcodeBalance.status === "available"
                  ? `${overview.shortcodeBalance.accountCount} ledger${overview.shortcodeBalance.accountCount === 1 ? "" : "s"}`
                  : "Awaiting balance callback"
              }
              tone={overview.shortcodeBalance.status === "available" ? "info" : "warning"}
              emphasis="hero"
            />
            <MetricCard
              label="Collections today"
              value={formatCurrency(overview.collectionsToday)}
              hint="Successful inbound volume"
              tone="success"
              emphasis="hero"
            />
            <MetricCard
              label="Payouts today"
              value={formatCurrency(overview.payoutsToday)}
              hint="Successful outbound volume"
              tone="neutral"
              emphasis="hero"
            />
            <MetricCard
              label="Success rate"
              value={formatPercent(successRate)}
              hint={`${totalTransactions || 0} persisted transactions`}
              tone={successRate >= 95 ? "success" : successRate >= 80 ? "warning" : "danger"}
              emphasis="hero"
            />
          </div>
        </div>

        <aside className="panel min-w-0 rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Watchlist
              </div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                Current priorities
              </h2>
            </div>
            <StatusBadge value={overview.providerHealth} />
          </div>

          <div className="mt-5 space-y-3">
            {watchlist.slice(0, 4).map((item) => (
              <div
                key={item.label}
                className="panel-muted flex min-w-0 items-start justify-between gap-4 rounded-[1.2rem] px-4 py-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">{item.label}</div>
                  <div className="mt-1 text-sm text-[var(--text-muted)]">{item.note}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-semibold tracking-[-0.03em] text-white">{item.value}</div>
                  <div className="mt-1">
                    <StatusBadge value={item.tone} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
            {[
              { href: "/transactions", label: "Transactions", hint: "Review failed and pending items" },
              { href: "/webhooks", label: "Callbacks", hint: "Inspect recent deliveries" },
              { href: "/api-requests", label: "API requests", hint: "Trace latency and status" },
              { href: "/mpesa", label: "M-Pesa ops", hint: "Run operational actions" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-[1.1rem] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 transition hover:border-sky-500/35 hover:bg-[var(--surface-3)]"
              >
                <div className="text-sm font-medium text-white">{action.label}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{action.hint}</div>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="panel min-w-0 rounded-[1.6rem] p-5">
        <SectionHeading title="Operational signals" detail="Current load, callback flow, and queue health." />
        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <CompactSignal
            label="Pending queue"
            value={pendingTransactions}
            note={pendingTransactions ? "Open transaction follow-up" : "Queue is clear"}
            tone={getSignalTone(pendingTransactions, "success")}
          />
          <CompactSignal
            label="Failed requests"
            value={failedRequests}
            note={failedRequests ? "Recent transport or validation failures" : "No recent request failures"}
            tone={getSignalTone(failedRequests, "success")}
          />
          <CompactSignal
            label="Slow requests"
            value={slowRequests}
            note={slowRequests ? "Recent requests exceeded 1s" : "No slow requests logged"}
            tone={getSignalTone(slowRequests, "success")}
          />
          <CompactSignal
            label="Callbacks"
            value={overview.callbackCount}
            note={latestCallback ? `Latest ${formatDateTime(latestCallback.receivedAt)}` : "No callbacks stored"}
            tone={latestCallback ? "neutral" : "warning"}
          />
          <CompactSignal
            label="Active apps"
            value={overview.activeApplicationCount}
            note="Clients seen in telemetry"
            tone="neutral"
          />
        </div>
      </section>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <ProviderStatus
          environment={overview.environment}
          providerHealth={overview.providerHealth}
          oauthHealthy={overview.oauthHealthy}
          balanceFreshness={balanceFreshness}
          projectionUpdatedAt={formatDateTime(overview.projectionUpdatedAt)}
        />

        <section className="panel min-w-0 rounded-[1.6rem] p-6">
          <SectionHeading
            title="Gateway mix"
            detail={`${totalTransactions || 0} persisted transactions`}
          />
          <div className="mt-5 space-y-4">
            {operationMix.length ? (
              operationMix.map(([operation, count]) => {
                const percent = totalTransactions ? Math.round((count / totalTransactions) * 100) : 0;

                return (
                  <div key={operation} className="min-w-0">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <div className="truncate font-medium text-white">{formatOperationLabel(operation)}</div>
                      <div className="flex shrink-0 items-center gap-3 text-[var(--text-muted)]">
                        <span>{count}</span>
                        <span>{percent}%</span>
                      </div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#58b8ff_0%,#2f79ff_100%)]"
                        style={{ width: `${Math.max(percent, 10)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No transaction mix is available yet.</p>
            )}
          </div>
        </section>
      </section>

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.85fr)]">
        <div className="min-w-0 space-y-4">
          <SectionHeading
            title="Recent transactions"
            detail="Latest persisted provider activity."
            actionHref="/transactions"
            actionLabel="View all"
          />
          <TransactionTable items={transactions} />
        </div>

        <div className="min-w-0 space-y-5">
          <section className="panel min-w-0 rounded-[1.6rem] p-6">
            <SectionHeading
              title="API activity"
              detail={requestLogs.length ? `${requestLogs.length} recent requests` : "No recent requests"}
              actionHref="/api-requests"
              actionLabel="Open logs"
            />

            <div className="mt-5 space-y-3">
              {requestLogs.length ? (
                requestLogs.map((log) => (
                  <div
                    key={log.id}
                    className="panel-muted grid min-w-0 gap-3 rounded-[1.2rem] px-4 py-4"
                  >
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[var(--border)] px-2 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300">
                            {log.method}
                          </span>
                          <div className="truncate text-sm font-medium text-white">{log.route}</div>
                        </div>
                        <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                          <span className="mono truncate">{log.requestId}</span>
                          <span>{formatOperationLabel(log.operation)}</span>
                          <span>{formatDateTime(log.timestamp)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="mono text-xs text-slate-300">{log.latencyMs}ms</span>
                        <StatusBadge value={log.status >= 400 ? "failed" : log.providerStatus ?? "healthy"} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No request activity yet.</p>
              )}
            </div>
          </section>

          <section className="panel min-w-0 rounded-[1.6rem] p-6">
            <SectionHeading title="Activity" detail="Latest transaction, callback, and request events." />
            <div className="mt-5 space-y-4">
              {activityFeed.length ? (
                activityFeed.map((item) => (
                  <div key={item.id} className="flex min-w-0 gap-3">
                    <div className="flex w-6 shrink-0 justify-center">
                      <div className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-400" />
                    </div>
                    <div className="min-w-0 flex-1 border-l border-[var(--border)] pl-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">{item.title}</div>
                          <div className="mt-1 text-sm text-[var(--text-muted)]">{item.meta}</div>
                        </div>
                        <StatusBadge value={item.tone} />
                      </div>
                      <div className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                        {formatDateTime(item.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No recent activity.</p>
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
