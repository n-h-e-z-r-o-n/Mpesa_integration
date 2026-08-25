import Link from "next/link";

export function LoginBrandPanel() {
  return (
    <div className="flex h-full flex-col justify-between rounded-[2.5rem] bg-[#08111a] p-8 text-white lg:p-10">
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-300">
          Zadhron Payments
        </div>
        <h1 className="mt-8 max-w-lg text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
          Infrastructure for moving money reliably.
        </h1>
        <p className="mt-6 max-w-md text-base leading-8 text-slate-300">
          Sign in to manage payment operations, inspect transactions, and continue into the current
          Zadhron Payments console.
        </p>
      </div>

      <div className="mt-10 grid gap-4">
        <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Gateway Surface</div>
          <div className="mono mt-3 text-sm text-slate-100">/api/mpesa/*</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[1.8rem] border border-white/10 bg-sky-400/10 p-5">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Transaction Status</div>
            <div className="mt-6 text-2xl font-semibold tracking-[-0.04em]">Traceable</div>
          </div>
          <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Request Correlation</div>
            <div className="mono mt-6 text-sm text-slate-100">zadhron_48fd91aa...</div>
          </div>
        </div>
      </div>

      <div className="mt-10 text-sm text-slate-400">
        Need product context first?{" "}
        <Link href="/" className="text-slate-100 underline decoration-slate-600 underline-offset-4">
          Return to the public overview
        </Link>
      </div>
    </div>
  );
}
