import { CopyableIdentifier } from "@/components/ui/copyable-identifier";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { TransactionRecord } from "@/types/gateway";

type Props = {
  items: TransactionRecord[];
};

function formatDateTime(value: string) {
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

export function TransactionTable({ items }: Props) {
  if (!items.length) {
    return (
      <EmptyState
        title="No transactions yet"
        description="Persisted gateway activity will appear here."
      />
    );
  }

  return (
    <div className="panel min-w-0 overflow-hidden rounded-[1.4rem]">
      <div className="thin-scrollbar max-w-full overflow-x-auto">
        <table className="w-full min-w-[860px] table-fixed text-left text-sm">
          <thead className="bg-[var(--surface-2)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            <tr>
              <th className="w-[26%] px-4 py-3">Request</th>
              <th className="w-[18%] px-4 py-3">Operation</th>
              <th className="w-[12%] px-4 py-3">Amount</th>
              <th className="w-[22%] px-4 py-3">Provider IDs</th>
              <th className="w-[10%] px-4 py-3">Status</th>
              <th className="w-[12%] px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-[var(--border)]">
                <td className="px-4 py-3">
                  <div className="min-w-0 space-y-2">
                    <CopyableIdentifier value={item.requestId} />
                    <div className="truncate text-xs text-[var(--text-muted)]">{item.applicationId}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-100">
                      {formatOperationLabel(item.operation)}
                    </div>
                    <div className="mono mt-1 truncate text-xs text-[var(--text-muted)]">
                      {item.partyB ?? item.transactionId ?? item.accountReference ?? "n/a"}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="mono text-slate-200">{item.amount ?? "n/a"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="min-w-0 space-y-2">
                    <CopyableIdentifier value={item.providerConversationId ?? item.providerRequestId} />
                    <div className="mono truncate text-xs text-[var(--text-muted)]">
                      {item.transactionId ?? "No transaction ID"}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={item.status} />
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-200">{formatDateTime(item.createdAt)}</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">{formatDateTime(item.updatedAt)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
