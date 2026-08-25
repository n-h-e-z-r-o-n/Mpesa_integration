import { JsonViewer } from "@/components/ui/json-viewer";
import { getGatewayConfig } from "@/lib/mpesa/config";

export default function SettingsPage() {
  const config = getGatewayConfig();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Sanitized runtime configuration and callback topology.
        </p>
      </div>

      <section className="panel rounded-sm p-5">
        <h2 className="text-lg font-semibold text-white">Runtime Summary</h2>
        <div className="mt-4">
          <JsonViewer
            value={{
              appName: config.appName,
              appEnvironment: config.appEnvironment,
              mpesaEnvironment: config.mpesaEnvironment,
              mpesaBaseUrl: config.mpesaBaseUrl,
              callbackBaseUrl: config.callbackBaseUrl,
              callbackUrls: config.callbackUrls,
              hasInitiatorName: Boolean(config.initiatorName),
              hasInitiatorPassword: Boolean(config.initiatorPassword),
              hasSecurityCredential: Boolean(config.securityCredential),
              hasCertificatePath: Boolean(config.certificatePath),
              applicationCount: config.applications.length,
            }}
          />
        </div>
      </section>
    </div>
  );
}
