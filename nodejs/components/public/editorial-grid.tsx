export function EditorialGrid() {
  return (
    <section id="solutions" className="bg-[#eef2f6] px-5 py-20 text-slate-950 sm:px-8 lg:py-24">
      <div className="mx-auto grid max-w-[1480px] gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Operating Model</div>
          <h2 className="mt-6 max-w-xl text-4xl font-semibold tracking-[-0.05em] sm:text-5xl lg:text-6xl">
            One integration. Multiple ways to move money.
          </h2>
          <p className="mt-6 max-w-lg text-base leading-8 text-slate-600">
            Zadhron Payments centralizes payout execution, collection flows, callback handling,
            transaction verification, and gateway observability around a single authenticated surface.
          </p>
        </div>

        <div className="grid gap-5 xl:col-span-7 xl:grid-cols-7">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 xl:col-span-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Collection</div>
            <div className="mt-6 text-2xl font-semibold tracking-[-0.04em]">STK Push request accepted</div>
            <div className="mono mt-6 text-sm text-slate-500">CheckoutRequestID ws_CO_240820261525...</div>
          </article>

          <article className="rounded-[2rem] bg-[#0b1623] p-6 text-white xl:col-span-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Payout</div>
            <div className="mt-7 text-3xl font-semibold tracking-[-0.05em]">B2C</div>
            <div className="mt-3 text-sm leading-7 text-slate-300">
              Controlled disbursement initiation with idempotency-ready request handling.
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-sky-50 p-6 xl:col-span-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-sky-700">Status Query</div>
            <div className="mt-6 text-sm leading-7 text-slate-700">
              Verify transaction state, retrieve provider result codes, and reconcile operational outcomes.
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-white p-6 xl:col-span-3">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Webhook</div>
            <div className="mt-5 space-y-3">
              <div className="rounded-[1rem] border border-slate-200 px-4 py-3 text-sm">callback received</div>
              <div className="rounded-[1rem] border border-slate-200 px-4 py-3 text-sm">payload sanitized</div>
              <div className="rounded-[1rem] border border-slate-200 px-4 py-3 text-sm">transaction updated</div>
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-200 bg-[#dde8f7] p-6 xl:col-span-2">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-600">Service Health</div>
            <div className="mt-8 text-5xl font-semibold tracking-[-0.06em]">OAuth</div>
            <div className="mt-2 text-sm text-slate-600">Provider reachability and token readiness are surfaced directly.</div>
          </article>
        </div>
      </div>
    </section>
  );
}
