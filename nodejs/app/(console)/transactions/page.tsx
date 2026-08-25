import { TransactionExplorer } from "@/components/transactions/transaction-explorer";
import { getTransactions } from "@/lib/repositories/runtime-store";

export default function TransactionsPage() {
  const transactions = getTransactions();
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
