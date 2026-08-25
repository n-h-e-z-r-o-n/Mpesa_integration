import { CopyableIdentifier } from "@/components/ui/copyable-identifier";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { TransactionRecord } from "@/types/gateway";

type Props = {
  items: TransactionRecord[];
};

export function TransactionTable({ items }: Props) {
  if (!items.length) {
    return (
      <EmptyState
        title="No transaction runtime data"
        description="This runtime instance has not initiated or observed transactions yet. Once the gateway starts processing requests, accepted requests and callback updates will appear here."
      />
    );
  }

  return (
    <div className="panel overflow-hidden rounded-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--surface-2)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Operation</th>
              <th className="px-4 py-3">Application</th>
              <th className="px-4 py-3">Party</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Conversation</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">
                  <CopyableIdentifier value={item.requestId} />
                </td>
                <td className="px-4 py-3 text-slate-200">{item.operation}</td>
                <td className="px-4 py-3 text-slate-200">{item.applicationId}</td>
                <td className="px-4 py-3">
                  <div className="mono text-xs text-slate-200">{item.partyB ?? item.transactionId ?? "n/a"}</div>
                </td>
                <td className="px-4 py-3 text-slate-200">{item.amount ?? "n/a"}</td>
                <td className="px-4 py-3">
                  <CopyableIdentifier value={item.providerConversationId ?? item.providerRequestId} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={item.status} />
                </td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
