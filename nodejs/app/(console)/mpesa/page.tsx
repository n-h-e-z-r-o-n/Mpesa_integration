import { EndpointTester } from "@/components/payments/endpoint-tester";
import { operationCatalog } from "@/lib/gateway/catalog";
import { getGatewayConfig } from "@/lib/mpesa/config";
import { ProviderStatus } from "@/components/dashboard/provider-status";
import { StatusBadge } from "@/components/ui/status-badge";
import { getGatewayOverview } from "@/services/mpesa/service";

export default async function MpesaPage() {
  const overview = await getGatewayOverview();
  const config = getGatewayConfig();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">M-Pesa</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Provider configuration, supported operations, and callback routing.
        </p>
      </div>

      <ProviderStatus
        environment={overview.environment}
        providerHealth={overview.providerHealth}
        oauthHealthy={overview.oauthHealthy}
      />

      <section className="panel rounded-sm p-5">
        <h2 className="text-lg font-semibold text-white">Configuration Surface</h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="panel-muted rounded-sm p-4">
            <dt className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Base URL</dt>
            <dd className="mono mt-2 text-xs text-slate-200">{config.mpesaBaseUrl}</dd>
          </div>
          <div className="panel-muted rounded-sm p-4">
            <dt className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Shortcode</dt>
            <dd className="mono mt-2 text-xs text-slate-200">{config.shortcode}</dd>
          </div>
        </dl>
      </section>

      <section className="panel rounded-sm p-5">
        <h2 className="text-lg font-semibold text-white">Supported Operations</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {operationCatalog.map((operation) => (
            <article key={operation.id} className="panel-muted rounded-sm p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">{operation.label}</h3>
                <StatusBadge value={operation.moneyMoving ? "accepted" : "healthy"} />
              </div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{operation.description}</p>
              <div className="mono mt-3 text-xs text-slate-300">{operation.method} {operation.route}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel rounded-sm p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Test Supported Operations</h2>
            <p className="mt-2 max-w-3xl text-sm text-[var(--text-muted)]">
              Select any supported M-Pesa operation, send a request from the admin session, and
              inspect the normalized response without leaving this page.
            </p>
          </div>
          <StatusBadge value="accepted" />
        </div>
        <div className="mt-6">
          <EndpointTester operations={operationCatalog} />
        </div>
      </section>
    </div>
  );
}
