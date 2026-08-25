import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { getGatewayConfig } from "@/lib/mpesa/config";

export default function ApplicationsPage() {
  const applications = getGatewayConfig().applications;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Applications</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Environment-backed application registry for internal Zadhron services.
        </p>
      </div>

      {applications.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {applications.map((application) => (
            <section key={application.id} className="panel rounded-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">{application.name}</h2>
                  <div className="mono mt-2 text-xs text-[var(--text-muted)]">{application.id}</div>
                </div>
                <StatusBadge value={application.enabled ? "healthy" : "failed"} />
              </div>
              <div className="mt-4 text-sm text-[var(--text-muted)]">
                <div>Scopes: {application.scopes.join(", ") || "none"}</div>
                <div className="mt-2">
                  Rate limit: {application.rateLimitPerMinute ? `${application.rateLimitPerMinute}/min` : "not configured"}
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No applications configured"
          description="Set GATEWAY_APPLICATIONS_JSON to define consuming Zadhron applications, their scopes, and rate limits."
        />
      )}
    </div>
  );
}
