import { EndpointTester } from "@/components/payments/endpoint-tester";
import { operationCatalog } from "@/lib/gateway/catalog";

export default function ApiRequestsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">API Requests</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Structured request testing for the Node gateway without relying on Swagger.
        </p>
      </div>
      <EndpointTester operations={operationCatalog} />
    </div>
  );
}
