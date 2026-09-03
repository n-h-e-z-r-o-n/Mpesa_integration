import { StatusBadge } from "@/components/ui/status-badge";

type Props = {
  environment: string;
  providerHealth: "healthy" | "degraded" | "down";
  oauthHealthy: boolean;
  balanceFreshness?: string;
  projectionUpdatedAt?: string;
};

export function ProviderStatus({
  environment,
  providerHealth,
  oauthHealthy,
  balanceFreshness = "Unavailable",
  projectionUpdatedAt = "No data",
}: Props) {
  return (
    <section className="panel min-w-0 rounded-[1.6rem] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Gateway health</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Provider, auth, and snapshot state.</p>
        </div>
        <StatusBadge value={providerHealth} />
      </div>

      <dl className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="panel-muted min-w-0 rounded-[1.2rem] p-4">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Provider</dt>
          <dd className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white">Safaricom M-Pesa</span>
            <StatusBadge value={providerHealth} />
          </dd>
        </div>
        <div className="panel-muted min-w-0 rounded-[1.2rem] p-4">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">OAuth</dt>
          <dd className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white">Token probe</span>
            <StatusBadge value={oauthHealthy ? "healthy" : "failed"} />
          </dd>
        </div>
        <div className="panel-muted min-w-0 rounded-[1.2rem] p-4">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Environment</dt>
          <dd className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white">Active routing</span>
            <StatusBadge value={environment} />
          </dd>
        </div>
        <div className="panel-muted min-w-0 rounded-[1.2rem] p-4">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Balance snapshot
          </dt>
          <dd className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-white">{balanceFreshness}</span>
            <span className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Current age</span>
          </dd>
        </div>
      </dl>

      <div className="mt-5 rounded-[1.2rem] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--text-muted)]">
        Projection updated {projectionUpdatedAt}
      </div>
    </section>
  );
}
