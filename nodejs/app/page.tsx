import Link from "next/link";

import { CapabilitySection } from "@/components/public/capability-section";
import { DeveloperPreview } from "@/components/public/developer-preview";
import { EditorialGrid } from "@/components/public/editorial-grid";
import { InfrastructureSection } from "@/components/public/infrastructure-section";
import { PaymentVisualization } from "@/components/public/payment-visualization";
import { PublicCta } from "@/components/public/public-cta";
import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { SecuritySection } from "@/components/public/security-section";
import { getAdminSession } from "@/lib/auth/admin-session";

export default async function HomePage() {
  const session = await getAdminSession();

  return (
    <PublicSiteFrame>
      <main>
        <section className="overflow-hidden bg-[#071019] px-5 pb-18 pt-10 sm:px-8 lg:pb-24 lg:pt-16">
          <div className="mx-auto max-w-[1480px]">
            {session ? (
              <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-[1.8rem] border border-sky-300/15 bg-sky-400/8 px-5 py-4 text-sm text-slate-200">
                <div>
                  Authenticated session detected for{" "}
                  <span className="mono text-sky-200">{session.email}</span>.
                </div>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-sm text-white transition hover:bg-sky-400/15"
                >
                  Enter dashboard
                </Link>
              </div>
            ) : null}

            <div className="grid items-end gap-10 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="max-w-2xl">
                <div className="text-[11px] uppercase tracking-[0.18em] text-sky-300">
                  Unified Payment Infrastructure
                </div>
                <h1 className="mt-6 text-5xl font-semibold tracking-[-0.07em] text-white sm:text-6xl lg:text-7xl">
                  Payments infrastructure built for how Africa moves money.
                </h1>
                <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                  Zadhron Payments helps applications and businesses collect, send, verify, and
                  monitor payments through a unified API and a shared operational control plane.
                </p>

                <div className="mt-9 flex flex-wrap gap-3">
                  <Link
                    href="/signup"
                    className="rounded-full bg-[#eef4ff] px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-white"
                  >
                    Start building
                  </Link>
                  <Link
                    href="/docs"
                    className="rounded-full border border-white/15 px-5 py-3 text-sm text-slate-100 transition hover:border-white/30 hover:bg-white/5"
                  >
                    View documentation
                  </Link>
                </div>

                <div className="mt-12 grid gap-4 sm:grid-cols-3">
                  {[
                    ["Collect", "STK and callback-aware collection flows"],
                    ["Send", "Controlled payout and disbursement operations"],
                    ["Observe", "Request IDs, logs, callbacks, and health signals"],
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-[1.6rem] border border-white/10 bg-white/[0.03] p-4">
                      <div className="text-sm font-medium text-white">{title}</div>
                      <div className="mt-2 text-sm leading-7 text-slate-400">{body}</div>
                    </div>
                  ))}
                </div>
              </div>

              <PaymentVisualization />
            </div>
          </div>
        </section>

        <EditorialGrid />
        <CapabilitySection />
        <DeveloperPreview />
        <InfrastructureSection />
        <SecuritySection />
        <PublicCta />
      </main>
    </PublicSiteFrame>
  );
}
