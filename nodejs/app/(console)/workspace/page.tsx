import { AdminOperationsWorkspace } from "@/components/payments/admin-operations-workspace";
import { TransactionExplorer } from "@/components/transactions/transaction-explorer";
import { adminOperatorOperations } from "@/lib/gateway/admin-operations";
import { listStoredTransactions } from "@/lib/repositories/telemetry-store";
import type { TransactionRecord } from "@/types/gateway";

export default async function WorkspacePage() {
  const transactions: TransactionRecord[] =
    (await listStoredTransactions().catch(() => null)) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Workspace</h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
          Admin operator workspace for transaction pull-outs, balance refreshes, callback
          registration, and reconciliation-style M-Pesa tasks.
        </p>
      </div>

      <section className="panel rounded-sm p-5">
        <h2 className="text-lg font-semibold text-white">Admin Actions</h2>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
          Use the focused action set below for transaction status queries, account balance checks,
          pull-transactions registration and query flows, and callback registration.
        </p>
        <div className="mt-6">
          <AdminOperationsWorkspace operations={adminOperatorOperations} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Pulled Transactions</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Review persisted transaction telemetry, then filter by operation, status, or
            application when tracing operator actions.
          </p>
        </div>
        <TransactionExplorer items={transactions} />
      </section>
    </div>
  );
}
