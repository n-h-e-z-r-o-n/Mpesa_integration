import { TransactionExplorer } from "@/components/transactions/transaction-explorer";
import { listStoredTransactions } from "@/lib/repositories/telemetry-store";
import { getTransactions } from "@/lib/repositories/runtime-store";
import type { TransactionRecord } from "@/types/gateway";

export default async function TransactionsPage() {
  const transactions: TransactionRecord[] =
    (await listStoredTransactions().catch(() => null)) ?? getTransactions();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Transactions</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Gateway transaction lifecycle records with provider conversation tracking.
        </p>
      </div>
      <TransactionExplorer items={transactions} />
    </div>
  );
}
