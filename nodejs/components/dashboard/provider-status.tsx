import { StatusBadge } from "@/components/ui/status-badge";

type Props = {
  environment: string;
  providerHealth: "healthy" | "degraded" | "down";
  oauthHealthy: boolean;
};

export function ProviderStatus({ environment, providerHealth, oauthHealthy }: Props) {
  return (
    <section className="panel rounded-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Provider Status</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Live status derived from the configured Safaricom environment.
          </p>
        </div>
        <StatusBadge value={providerHealth} />
      </div>

      <dl className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="panel-muted rounded-sm p-4">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            M-Pesa Environment
          </dt>
          <dd className="mt-2 text-base font-medium text-white">{environment}</dd>
        </div>
        <div className="panel-muted rounded-sm p-4">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
            OAuth Probe
          </dt>
          <dd className="mt-2 flex items-center gap-2">
            <StatusBadge value={oauthHealthy ? "healthy" : "failed"} />
          </dd>
        </div>
      </dl>
    </section>
  );
}
