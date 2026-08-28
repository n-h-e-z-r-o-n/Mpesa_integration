import Link from "next/link";

import { requireMerchantUser } from "@/lib/auth/app-session";

export default async function MerchantDashboardPage() {
  const user = await requireMerchantUser();

  return (
    <main className="min-h-screen bg-[#0a1320] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-[1180px]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.22)]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-sky-200">Merchant workspace</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em]">Gateway dashboard</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200/88">
            Signed in as <span className="mono text-white">{user.email}</span>. This merchant-facing workspace is now the landing target for non-admin users authenticated through Supabase.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0f1b2c] p-5">
              <div className="text-sm text-slate-300">Access profile</div>
              <div className="mt-3 text-2xl font-semibold">Merchant</div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0f1b2c] p-5">
              <div className="text-sm text-slate-300">Authentication</div>
              <div className="mt-3 text-2xl font-semibold">Supabase</div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-[#0f1b2c] p-5">
              <div className="text-sm text-slate-300">Next step</div>
              <div className="mt-3 text-2xl font-semibold">API setup</div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/docs"
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
            >
              View integration docs
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/15 px-5 py-3 text-sm text-white transition hover:bg-white/5"
            >
              Back to landing page
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
