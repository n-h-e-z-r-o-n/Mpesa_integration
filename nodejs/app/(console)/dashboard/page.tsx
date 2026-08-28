import Link from "next/link";

import { ProviderStatus } from "@/components/dashboard/provider-status";
import { MetricCard } from "@/components/ui/metric-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { getCallbacks, getRequestLogs, getTransactions } from "@/lib/repositories/runtime-store";
import { getGatewayOverview } from "@/services/mpesa/service";

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export default async function DashboardPage() {
  const overview = await getGatewayOverview();
  const callbacks = getCallbacks();
  const transactions = getTransactions().slice(0, 6);
  const requestLogs = getRequestLogs().slice(0, 6);
  const allTransactions = getTransactions();
  const totalTransactions = allTransactions.length;
  const successfulTransactions = overview.transactions.succeeded;
  const successRate = totalTransactions
    ? (successfulTransactions / totalTransactions) * 100
    : 0;
  const activeApplications = new Set(allTransactions.map((item) => item.applicationId)).size;
  const mostRecentTransaction = allTransactions[0];
  const latestCallback = callbacks[0];
  const slowRequests = requestLogs.filter((log) => log.latencyMs >= 1000).length;
  const requestFailureCount = requestLogs.filter((log) => log.status >= 400).length;
  const operationMix = Object.entries(
    allTransactions.reduce<Record<string, number>>((accumulator, transaction) => {
      accumulator[transaction.operation] = (accumulator[transaction.operation] ?? 0) + 1;
      return accumulator;
    }, {}),
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);
  const activityFeed = [
    mostRecentTransaction
      ? {
          id: `transaction-${mostRecentTransaction.id}`,
          label: `${mostRecentTransaction.operation} ${mostRecentTransaction.status}`,
          meta: mostRecentTransaction.applicationId,
          timestamp: mostRecentTransaction.updatedAt,
          tone: mostRecentTransaction.status,
        }
      : null,
    latestCallback
      ? {
          id: `callback-${latestCallback.id}`,
          label: `${latestCallback.callbackName} callback received`,
          meta: latestCallback.sourceIp ?? "Safaricom callback",
          timestamp: latestCallback.receivedAt,
          tone: latestCallback.processingStatus,
        }
      : null,
    requestLogs[0]
      ? {
          id: `request-${requestLogs[0].id}`,
          label: `${requestLogs[0].operation} request ${requestLogs[0].status >= 400 ? "failed" : "completed"}`,
          meta: `${requestLogs[0].method} ${requestLogs[0].route}`,
          timestamp: requestLogs[0].timestamp,
          tone: requestLogs[0].status >= 400 ? "failed" : "healthy",
        }
      : null,
  ].filter(Boolean) as Array<{
    id: string;
    label: string;
    meta: string;
    timestamp: string;
    tone: string;
  }>;

  return (
    <div className="space-y-7">
      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(87,166,255,0.24),transparent_32%),linear-gradient(135deg,#101b31_0%,#0a1220_58%,#070d16_100%)] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.26)]">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-200">
                Admin overview
              </span>
              <StatusBadge value={overview.providerHealth} />
              <StatusBadge value={overview.environment} />
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              Central command for gateway health, callbacks, and operational traffic.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-200/80">
              Monitor transaction throughput, inspect callback intake, and spot degraded provider behavior before it impacts merchant traffic.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Success rate</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                  {formatPercent(successRate)}
                </div>
                <div className="mt-2 text-sm text-slate-300/80">
                  Based on {totalTransactions || 0} observed runtime transactions.
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Active applications</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                  {activeApplications || 0}
                </div>
                <div className="mt-2 text-sm text-slate-300/80">
                  Distinct gateway clients seen in this runtime window.
                </div>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-300">Slow requests</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
                  {slowRequests}
                </div>
                <div className="mt-2 text-sm text-slate-300/80">
                  Requests at or above one second latency.
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="panel rounded-[2rem] p-6">
          <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Operator actions
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
            Move fast through the console
          </h2>
          <div className="mt-6 grid gap-3">
            {[
              { href: "/transactions", label: "Review transactions", hint: "Inspect provider IDs and outcomes." },
              { href: "/webhooks", label: "Check callbacks", hint: "Verify inbound Safaricom payloads." },
              { href: "/api-requests", label: "Open request logs", hint: "Audit traffic and latency." },
              { href: "/settings", label: "Confirm routing", hint: "Inspect callback topology and environment." },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-[1.2rem] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4 transition hover:border-sky-500/40 hover:bg-[var(--surface-3)]"
              >
                <div className="text-sm font-medium text-white">{action.label}</div>
                <div className="mt-1 text-sm text-[var(--text-muted)]">{action.hint}</div>
              </Link>
            ))}
          </div>
        </section>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Successful Transactions" value={overview.transactions.succeeded} hint="Completed successfully in the active runtime." />
        <MetricCard label="Pending Transactions" value={overview.transactions.pending} hint="Awaiting callback or downstream confirmation." />
        <MetricCard label="Failed Transactions" value={overview.transactions.failed} hint="Provider, validation, or execution failures." />
        <MetricCard label="Callbacks Received" value={overview.callbackCount} hint="Inbound callback deliveries accepted by the gateway." />
        <MetricCard label="Failed Requests" value={requestFailureCount} hint="HTTP 4xx/5xx request activity in the recent request window." />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <ProviderStatus
          environment={overview.environment}
          providerHealth={overview.providerHealth}
          oauthHealthy={overview.oauthHealthy}
        />

        <section className="panel rounded-[1.5rem] p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Gateway Mix</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Most frequently observed operations in the current runtime window.
              </p>
            </div>
            <div className="text-sm text-[var(--text-muted)]">{totalTransactions} total tx</div>
          </div>

          <div className="mt-5 space-y-4">
            {operationMix.length ? (
              operationMix.map(([operation, count]) => {
                const width = totalTransactions ? Math.max(12, Math.round((count / totalTransactions) * 100)) : 12;

                return (
                  <div key={operation}>
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <div className="font-medium text-white">{operation}</div>
                      <div className="text-[var(--text-muted)]">{count}</div>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#58b8ff_0%,#2f79ff_100%)]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                Operation mix will populate once the runtime starts handling live gateway traffic.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Last observed gateway operations with provider identifiers and status.
              </p>
            </div>
            <Link href="/transactions" className="text-sm text-sky-300 transition hover:text-sky-200">
              View all
            </Link>
          </div>
          <TransactionTable items={transactions} />
        </section>

        <section className="panel rounded-[1.5rem] p-6">
          <div>
            <h2 className="text-lg font-semibold text-white">Operational Activity</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Most recent transaction, callback, and request events seen by this deployment.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {activityFeed.length ? (
              activityFeed.map((item) => (
                <div key={item.id} className="panel-muted rounded-[1.2rem] px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-white">{item.label}</div>
                    <StatusBadge value={item.tone} />
                  </div>
                  <div className="mt-2 text-sm text-[var(--text-muted)]">{item.meta}</div>
                  <div className="mt-3 text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No recent activity has been observed yet.</p>
            )}
          </div>
        </section>
      </div>

      <section className="panel rounded-[1.5rem] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Recent API Request Activity</h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Request IDs, latency, and status signals for the latest gateway traffic.
            </p>
          </div>
          <div className="text-sm text-[var(--text-muted)]">
            {requestLogs.length} recent requests
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {requestLogs.length ? requestLogs.map((log) => (
            <div key={log.id} className="panel-muted rounded-[1.2rem] px-4 py-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="mono text-xs text-slate-300">{log.requestId}</div>
                <div className="flex items-center gap-3">
                  <div className="text-[var(--text-muted)]">{log.latencyMs}ms</div>
                  <StatusBadge value={log.status >= 400 ? "failed" : log.providerStatus ?? "healthy"} />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[var(--text-muted)]">
                <span>{log.method}</span>
                <span>{log.route}</span>
                <span>{log.operation}</span>
                <span>{log.status}</span>
              </div>
            </div>
          )) : <p className="text-sm text-[var(--text-muted)]">No request log activity yet.</p>}
        </div>
      </section>
    </div>
  );
}
