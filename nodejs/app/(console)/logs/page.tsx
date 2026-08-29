import { EmptyState } from "@/components/ui/empty-state";
import { JsonViewer } from "@/components/ui/json-viewer";
import { listStoredRequestLogs } from "@/lib/repositories/telemetry-store";
import { getAuditLogs, getRequestLogs } from "@/lib/repositories/runtime-store";
import type { RequestLogRecord } from "@/types/gateway";

export default async function LogsPage() {
  const allRequestLogs: RequestLogRecord[] =
    (await listStoredRequestLogs().catch(() => null)) ?? getRequestLogs();
  const requestLogs = allRequestLogs.slice(0, 10);
  const auditLogs = getAuditLogs().slice(0, 10);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Logs</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Sanitized gateway request logs and operational audit events.
        </p>
      </div>

      <section className="panel rounded-sm p-5">
        <h2 className="text-lg font-semibold text-white">API Request Inspector</h2>
        <div className="mt-4 space-y-4">
          {requestLogs.length ? requestLogs.map((log) => (
            <div key={log.id} className="panel-muted rounded-sm p-4">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span>{log.method}</span>
                <span>{log.route}</span>
                <span>{log.status}</span>
                <span>{log.latencyMs}ms</span>
              </div>
              <div className="mono mt-2 text-xs text-[var(--text-muted)]">{log.requestId}</div>
            </div>
          )) : <EmptyState title="No request logs" description="Persisted request inspection will appear here after gateway traffic reaches this deployment." />}
        </div>
      </section>

      <section className="panel rounded-sm p-5">
        <h2 className="text-lg font-semibold text-white">Audit Log</h2>
        <div className="mt-4 space-y-4">
          {auditLogs.length ? auditLogs.map((log) => (
            <div key={log.id} className="panel-muted rounded-sm p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="uppercase tracking-[0.14em] text-[var(--text-muted)]">{log.level}</span>
                <span className="text-[var(--text-muted)]">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
              <div className="mt-2 text-slate-100">{log.message}</div>
              {log.data ? <div className="mt-3"><JsonViewer value={log.data} /></div> : null}
            </div>
          )) : <EmptyState title="No audit logs" description="Structured operational logs will appear as the gateway handles requests and callbacks." />}
        </div>
      </section>
    </div>
  );
}
