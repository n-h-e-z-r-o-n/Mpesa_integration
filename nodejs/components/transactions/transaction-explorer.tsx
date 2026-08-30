"use client";

import { Fragment } from "react";
import { useMemo, useState } from "react";

import { CopyableIdentifier } from "@/components/ui/copyable-identifier";
import { EmptyState } from "@/components/ui/empty-state";
import { JsonViewer } from "@/components/ui/json-viewer";
import { StatusBadge } from "@/components/ui/status-badge";
import type { TransactionRecord } from "@/types/gateway";

type Props = {
  items: TransactionRecord[];
};

export function TransactionExplorer({ items }: Props) {
  const [operation, setOperation] = useState("all");
  const [status, setStatus] = useState("all");
  const [application, setApplication] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (operation !== "all" && item.operation !== operation) {
          return false;
        }
        if (status !== "all" && item.status !== status) {
          return false;
        }
        if (application !== "all" && item.applicationId !== application) {
          return false;
        }
        return true;
      }),
    [application, items, operation, status],
  );

  const operations = Array.from(new Set(items.map((item) => item.operation)));
  const applications = Array.from(new Set(items.map((item) => item.applicationId)));

  if (!items.length) {
    return (
      <EmptyState
        title="No database transactions"
        description="Once transaction records are available in the database, you will be able to filter by operation, status, and application, then inspect the lifecycle inline."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="panel rounded-sm p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm text-slate-200">
            Operation
            <select
              value={operation}
              onChange={(event) => setOperation(event.target.value)}
              className="mt-2 w-full rounded-sm border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
            >
              <option value="all">All</option>
              {operations.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-200">
            Status
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-2 w-full rounded-sm border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
            >
              <option value="all">All</option>
              {["accepted", "pending", "succeeded", "failed", "cancelled", "timeout"].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-slate-200">
            Application
            <select
              value={application}
              onChange={(event) => setApplication(event.target.value)}
              className="mt-2 w-full rounded-sm border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
            >
              <option value="all">All</option>
              {applications.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="panel overflow-hidden rounded-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-2)] text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Operation</th>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Phone / Account</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Conversation</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <Fragment key={item.id}>
                  <tr
                    className="cursor-pointer border-t border-[var(--border)] hover:bg-[var(--surface-2)]/50"
                    onClick={() => setExpandedId((current) => (current === item.id ? null : item.id))}
                  >
                    <td className="px-4 py-3">
                      <CopyableIdentifier value={item.requestId} />
                    </td>
                    <td className="px-4 py-3 text-slate-200">{item.operation}</td>
                    <td className="px-4 py-3 text-slate-200">{item.applicationId}</td>
                    <td className="px-4 py-3 mono text-xs text-slate-200">{item.partyB ?? item.accountReference ?? "n/a"}</td>
                    <td className="px-4 py-3 text-slate-200">{item.amount ?? "n/a"}</td>
                    <td className="px-4 py-3">
                      <CopyableIdentifier value={item.providerConversationId ?? item.providerRequestId} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge value={item.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString()}</td>
                  </tr>
                  {expandedId === item.id ? (
                    <tr className="border-t border-[var(--border)] bg-[#0b1118]">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid gap-4 xl:grid-cols-2">
                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Sanitized Request</div>
                            <JsonViewer value={item.requestPayload} />
                          </div>
                          <div>
                            <div className="mb-2 text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">Lifecycle</div>
                            <JsonViewer
                              value={{
                                responsePayload: item.responsePayload,
                                callbackPayloads: item.callbackPayloads,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
