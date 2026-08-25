import { EmptyState } from "@/components/ui/empty-state";
import { JsonViewer } from "@/components/ui/json-viewer";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCallbacks } from "@/lib/repositories/runtime-store";

export default function WebhooksPage() {
  const callbacks = getCallbacks();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Webhooks</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Incoming callback deliveries from Safaricom, with sanitized payloads.
        </p>
      </div>

      {callbacks.length ? (
        <div className="space-y-4">
          {callbacks.map((callback) => (
            <section key={callback.id} className="panel rounded-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium text-white">{callback.callbackName}</h2>
                  <div className="mono mt-1 text-xs text-[var(--text-muted)]">{callback.requestId}</div>
                </div>
                <StatusBadge value={callback.processingStatus} />
              </div>
              <div className="mt-3 text-sm text-[var(--text-muted)]">
                Received {new Date(callback.receivedAt).toLocaleString()} {callback.sourceIp ? `from ${callback.sourceIp}` : ""}
              </div>
              <div className="mt-4">
                <JsonViewer value={callback.payload} />
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No callbacks observed"
          description="When Safaricom posts STK, B2C, B2B, reversal, balance, or Ratiba callbacks, the latest sanitized payloads will appear here."
        />
      )}
    </div>
  );
}
