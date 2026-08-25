import Link from "next/link";

export function DeveloperPreview() {
  return (
    <section id="developers" className="bg-[#07111a] px-5 py-20 text-white sm:px-8 lg:py-24">
      <div className="mx-auto grid max-w-[1480px] gap-10 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-sky-300">Developer Experience</div>
          <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Build around an authenticated payment surface, not a scattered provider maze.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-8 text-slate-300">
            The current gateway exposes authenticated `/api/mpesa/*` operations and normalized
            responses. The SDK shape below is presented as a future developer experience goal, while
            the REST shape shown remains truthful to the existing application.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/docs"
              className="rounded-full border border-white/15 px-5 py-3 text-sm text-slate-100 transition hover:border-white/30 hover:bg-white/5"
            >
              Documentation
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-[#eef4ff] px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-white"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] border border-sky-300/15 bg-[#0f1b2a] p-6">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Current REST integration</div>
            <pre className="mono mt-5 overflow-x-auto text-sm leading-7 text-slate-100">
{`const response = await fetch(
  "https://payments.zadhron.com/api/mpesa/b2c",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-zadhron-app-id": "app_live",
      "x-zadhron-app-secret": "••••••••"
    },
    body: JSON.stringify({
      phoneNumber: "2547••••••••",
      amount: 2500,
      remarks: "Payout"
    })
  }
);`}
            </pre>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#f3f6fb] p-6 text-slate-950">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Normalized response</div>
            <div className="mt-5 space-y-4">
              <div>
                <div className="mono text-sm">201 Accepted</div>
                <div className="mono mt-2 text-xs text-slate-500">requestId zadhron_48fd91aa...</div>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
                <div className="mono text-xs text-slate-500">operation</div>
                <div className="mt-2 text-base font-medium">b2c</div>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
                <div className="mono text-xs text-slate-500">status</div>
                <div className="mt-2 text-base font-medium">accepted</div>
              </div>
              <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4">
                <div className="mono text-xs text-slate-500">provider</div>
                <div className="mt-2 text-base font-medium">M-Pesa</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
