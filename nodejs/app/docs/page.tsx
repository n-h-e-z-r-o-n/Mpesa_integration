import { operationCatalog } from "@/lib/gateway/catalog";
import { getGatewayConfig } from "@/lib/mpesa/config";
import { PublicSiteFrame } from "@/components/public/public-site-frame";

const callbackLabels: Record<string, string> = {
  stk: "STK callback",
  c2bConfirmation: "C2B confirmation",
  c2bValidation: "C2B validation",
  b2cResult: "B2C result",
  b2cTimeout: "B2C timeout",
  b2bResult: "B2B result",
  b2bTimeout: "B2B timeout",
  transactionStatusResult: "Transaction status result",
  transactionStatusTimeout: "Transaction status timeout",
  reversalResult: "Reversal result",
  reversalTimeout: "Reversal timeout",
  accountBalanceResult: "Account balance result",
  accountBalanceTimeout: "Account balance timeout",
  ratiba: "Ratiba callback",
  pullTransactions: "Pull Transactions callback",
  billManager: "Bill Manager callback",
};

export default function DocsPage() {
  const config = getGatewayConfig();

  return (
    <PublicSiteFrame>
      <main className="bg-[#f7f3ec] px-5 py-16 text-slate-950 sm:px-8 lg:py-20">
        <div className="mx-auto max-w-[1180px] space-y-8">
          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.08)] sm:p-10">
            <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Developer docs</div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              M-Pesa gateway routes exposed by the Node.js deployment
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-slate-600">
              This deployment exposes the full M-Pesa route surface used by the gateway, including
              dedicated Bill Manager, Pull Transactions, and callback endpoints. Application routes
              require Zadhron application credentials. Callback routes are intended for Safaricom.
            </p>
          </section>

          <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.08)] sm:p-10">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">Operations</h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {operationCatalog.map((operation) => (
                <article key={operation.id} className="rounded-[1.5rem] border border-slate-200 bg-[#fbfaf7] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold">{operation.label}</h3>
                    <span className="rounded-full border border-slate-300 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-600">
                      {operation.method}
                    </span>
                  </div>
                  <div className="mono mt-3 text-xs text-slate-500">{operation.route}</div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{operation.description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.08)] sm:p-10">
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">Primary callbacks</h2>
              <div className="mt-6 space-y-4">
                {Object.entries(config.callbackUrls).map(([key, url]) => (
                  <div key={key} className="rounded-[1.5rem] border border-slate-200 bg-[#fbfaf7] p-4">
                    <div className="text-sm font-medium">{callbackLabels[key] ?? key}</div>
                    <div className="mono mt-2 break-all text-xs text-slate-500">{url}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.08)] sm:p-10">
              <h2 className="text-2xl font-semibold tracking-[-0.03em]">Compatibility callbacks</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                These legacy routes stay live for parity with the earlier Python integration and
                existing Safaricom callback registrations.
              </p>
              <div className="mt-6 space-y-4">
                {Object.entries(config.legacyCallbackUrls).map(([key, url]) => (
                  <div key={key} className="rounded-[1.5rem] border border-slate-200 bg-[#fbfaf7] p-4">
                    <div className="text-sm font-medium">{callbackLabels[key] ?? key}</div>
                    <div className="mono mt-2 break-all text-xs text-slate-500">{url}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </PublicSiteFrame>
  );
}
