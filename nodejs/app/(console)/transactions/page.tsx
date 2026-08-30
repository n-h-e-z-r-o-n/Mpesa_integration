import { unstable_noStore as noStore } from "next/cache";

import { TransactionExplorer } from "@/components/transactions/transaction-explorer";
import { listDatabaseTransactions } from "@/lib/repositories/transaction-store";
import type { TransactionRecord } from "@/types/gateway";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TransactionsPage() {
  noStore();

  let transactions: TransactionRecord[] = [];
  try {
    transactions = (await listDatabaseTransactions()) ?? [];
  } catch (error) {
    console.error("Unable to load database transactions for /transactions", error);
  }

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
