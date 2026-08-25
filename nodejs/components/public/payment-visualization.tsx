export function PaymentVisualization() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.85fr]">
      <div className="rounded-[2rem] border border-sky-300/15 bg-[#0f1a27] p-5 shadow-[0_20px_60px_rgba(5,14,24,0.45)]">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Live Operation</div>
            <div className="mono mt-2 text-sm text-slate-100">POST /api/mpesa/b2c</div>
          </div>
          <div className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-300">
            Completed
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Amount</div>
            <div className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white">
              KES 24,500.00
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Destination</div>
                <div className="mt-2 text-base font-medium text-white">M-Pesa</div>
              </div>
              <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Latency</div>
                <div className="mt-2 text-base font-medium text-white">327 ms</div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-sky-300/15 bg-sky-400/10 p-4">
            <div className="h-full min-w-[170px] rounded-[1.2rem] border border-sky-200/15 bg-[#08111b] p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Request ID</div>
              <div className="mono mt-3 text-xs leading-6 text-slate-200">
                zadhron_<br />
                48fd91aa-2f1c
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-[1.8rem] border border-slate-200/10 bg-[#f1f5fb] p-5 text-slate-950">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Webhook</div>
          <div className="mono mt-3 text-sm text-slate-900">/api/mpesa/callbacks/b2c/result</div>
          <div className="mt-5 flex items-center justify-between rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3">
            <div>
              <div className="text-sm font-medium">Delivery Status</div>
              <div className="mt-1 text-xs text-slate-500">Accepted and correlated</div>
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-emerald-700">
              200 OK
            </div>
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-sky-300/15 bg-[#122235] p-5">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Gateway Event</div>
          <div className="mt-4 space-y-3">
            <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-xs text-slate-400">Provider response</div>
              <div className="mt-1 text-sm text-white">OriginatorConversationID mapped</div>
            </div>
            <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-xs text-slate-400">Structured result</div>
              <div className="mt-1 text-sm text-white">Normalized gateway response returned</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
