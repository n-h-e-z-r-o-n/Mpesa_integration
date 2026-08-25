import { ProviderStatus } from "@/components/dashboard/provider-status";
import { MetricCard } from "@/components/ui/metric-card";
import { TransactionTable } from "@/components/transactions/transaction-table";
import { getRequestLogs, getTransactions } from "@/lib/repositories/runtime-store";
import { getGatewayOverview } from "@/services/mpesa/service";

export default async function DashboardPage() {
  const overview = await getGatewayOverview();
  const transactions = getTransactions().slice(0, 6);
  const requestLogs = getRequestLogs().slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Overview</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Operational summary for the Zadhron centralized payment gateway.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard label="Successful Transactions" value={overview.transactions.succeeded} hint="Runtime-local since current deployment boot." />
        <MetricCard label="Pending Transactions" value={overview.transactions.pending} hint="Awaiting callback or downstream query." />
        <MetricCard label="Failed Transactions" value={overview.transactions.failed} hint="Includes provider and validation failures." />
        <MetricCard label="Callbacks Received" value={overview.callbackCount} hint="Accepted callback deliveries seen by this runtime." />
      </div>

      <ProviderStatus
        environment={overview.environment}
        providerHealth={overview.providerHealth}
        oauthHealthy={overview.oauthHealthy}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Recent Transactions</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Last observed gateway operations with provider identifiers and status.
          </p>
        </div>
        <TransactionTable items={transactions} />
      </section>

      <section className="panel rounded-sm p-5">
        <h2 className="text-lg font-semibold text-white">Recent API Request Activity</h2>
        <div className="mt-4 grid gap-3">
          {requestLogs.length ? requestLogs.map((log) => (
            <div key={log.id} className="panel-muted rounded-sm px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="mono text-xs text-slate-300">{log.requestId}</div>
                <div className="text-[var(--text-muted)]">{log.latencyMs}ms</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-[var(--text-muted)]">
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
