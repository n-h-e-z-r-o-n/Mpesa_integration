import Link from "next/link";

const planCards = [
  {
    name: "Starter",
    audience: "Early launches and internal tools",
    monthly: "KES 0",
    kicker: "Pay only as you process",
    accent: "bg-[#e7f1ff] text-sky-800",
    summary:
      "A low-friction entry point for teams proving collection and payout flows before larger traffic arrives.",
    bullets: [
      "STK push, C2B, B2C, B2B, reversal, and callback routing",
      "Normalized responses and request tracing",
      "Basic transaction and callback visibility",
      "Email support during business hours",
    ],
  },
  {
    name: "Growth",
    audience: "Operational teams running daily payment volume",
    monthly: "KES 25,000",
    kicker: "Infrastructure plus deeper controls",
    accent: "bg-[#0e1a2b] text-white",
    summary:
      "Adds stronger operational tooling, tighter controls, and guided rollout support for live merchant traffic.",
    bullets: [
      "Everything in Starter",
      "Priority support and onboarding assistance",
      "Advanced transaction reconciliation workflows",
      "Environment-specific callback and routing support",
    ],
  },
  {
    name: "Enterprise",
    audience: "High-volume platforms and multi-team operations",
    monthly: "Custom",
    kicker: "Negotiated for scale",
    accent: "bg-[#f4ebe2] text-[#7b4520]",
    summary:
      "Structured for teams that need contract terms, operational guarantees, and rollout planning around complex payment programs.",
    bullets: [
      "Everything in Growth",
      "Volume-based commercial terms",
      "Dedicated solution design and migration planning",
      "Priority incident handling and escalation path",
    ],
  },
];

const usageRows = [
  {
    title: "Collections",
    price: "Custom rate",
    body: "Applied to successful money-in flows such as STK and supported C2B collection paths.",
  },
  {
    title: "Disbursements",
    price: "Custom rate",
    body: "Applied to successful money-out flows such as B2C, B2B, and Business to Pochi.",
  },
  {
    title: "Operational queries",
    price: "Included",
    body: "OAuth checks, transaction status queries, and account-balance requests are packaged into the platform plan.",
  },
  {
    title: "Callbacks and telemetry",
    price: "Included",
    body: "Inbound callback handling, normalized logging, and dashboard visibility are part of the platform surface.",
  },
];

const comparisonRows = [
  ["Gateway authentication", "Included", "Included", "Included"],
  ["Callback routing", "Included", "Included", "Included"],
  ["Admin transaction console", "Basic", "Advanced", "Advanced"],
  ["Reconciliation support", "Self-serve", "Guided", "Dedicated"],
  ["Commercial structure", "Usage-only", "Platform + usage", "Contracted"],
  ["Support response", "Business hours", "Priority", "Escalation path"],
];

const faqs = [
  {
    question: "Do you charge per API call or per successful transaction?",
    answer:
      "Commercials should be tied to the payment event, not noisy retries. The platform plans separate infrastructure access from transaction-based pricing so idempotent retries do not become a billing trap.",
  },
  {
    question: "Can pricing differ between collections and payouts?",
    answer:
      "Yes. Collections and disbursements usually carry different operational risk and provider cost profiles, so their transaction rates can be contracted separately.",
  },
  {
    question: "Is the admin dashboard included?",
    answer:
      "Yes. The dashboard, callback tracking, and transaction visibility are part of the gateway product. The level of operational support around them changes by plan.",
  },
  {
    question: "Can we start in sandbox and move to production later?",
    answer:
      "Yes. The intended path is to validate flows in sandbox, confirm callbacks and operational visibility, then move to a production configuration with agreed commercial terms.",
  },
];

export function PricingPage() {
  return (
    <main className="bg-[#f6efe4] text-slate-950">
      <section className="px-5 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto max-w-[1480px] overflow-hidden rounded-[2.8rem] border border-slate-200 bg-[linear-gradient(135deg,#fffaf2_0%,#fff_42%,#eaf3ff_100%)] shadow-[0_28px_90px_rgba(12,18,27,0.08)]">
          <div className="grid gap-8 px-8 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-12 lg:py-12">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Pricing</div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
                Pricing built for payment operations, not vanity API metrics.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
                The commercial model should follow real movement of money and the operational burden
                around it. This page is a standalone pricing surface for the Node.js gateway on
                August 30, 2026, with clear plan structure and room for negotiated transaction
                pricing where provider economics differ.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Start onboarding
                </Link>
                <Link
                  href="/docs"
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm text-slate-700 transition hover:border-slate-400 hover:bg-white"
                >
                  Review API docs
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.8rem] border border-slate-200 bg-white/90 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Commercial model</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Hybrid</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Platform access is separated from transaction-based pricing so operations remain
                  predictable as traffic grows.
                </p>
              </div>
              <div className="rounded-[1.8rem] border border-slate-200 bg-white/90 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Best for</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">M-Pesa teams</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Especially useful where collections, payouts, callbacks, and reconciliation need a
                  single operational surface.
                </p>
              </div>
              <div className="rounded-[1.8rem] border border-slate-200 bg-white/90 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Launch path</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Sandbox to live</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Start by validating flows and callbacks, then move into a live commercial setup
                  when routing and controls are proven.
                </p>
              </div>
              <div className="rounded-[1.8rem] border border-slate-200 bg-white/90 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Included</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">Dashboard</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Transaction visibility, callback monitoring, and gateway telemetry are part of the
                  product rather than separate add-ons.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-8 sm:px-8">
        <div className="mx-auto max-w-[1480px] grid gap-5 xl:grid-cols-3">
          {planCards.map((plan) => (
            <article
              key={plan.name}
              className="flex h-full flex-col rounded-[2.2rem] border border-slate-200 bg-white p-7 shadow-[0_20px_60px_rgba(7,16,25,0.06)]"
            >
              <div className={`inline-flex w-fit rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em] ${plan.accent}`}>
                {plan.audience}
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-slate-950">{plan.name}</h2>
              <div className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-950">{plan.monthly}</div>
              <div className="mt-2 text-sm text-slate-500">{plan.kicker}</div>
              <p className="mt-5 text-sm leading-8 text-slate-600">{plan.summary}</p>
              <div className="mt-6 h-px bg-slate-200" />
              <div className="mt-6 space-y-3 text-sm leading-7 text-slate-700">
                {plan.bullets.map((bullet) => (
                  <div key={bullet} className="rounded-[1.1rem] bg-[#fbfaf7] px-4 py-3">
                    {bullet}
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-2">
                <Link
                  href={plan.name === "Enterprise" ? "/docs" : "/signup"}
                  className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  {plan.name === "Enterprise" ? "Review technical surface" : "Choose this plan"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-[1480px] grid gap-8 xl:grid-cols-[0.88fr_1.12fr]">
          <div className="rounded-[2.4rem] border border-slate-200 bg-[#08111a] p-8 text-white shadow-[0_20px_60px_rgba(7,16,25,0.2)] sm:p-10">
            <div className="text-[11px] uppercase tracking-[0.18em] text-sky-300">Usage pricing</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">
              Charge against real payment outcomes.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-8 text-slate-300">
              Payment systems generate retries, callbacks, and operational checks. Billing straight
              off raw request count is the wrong incentive. The gateway is structured so transaction
              pricing can follow completed money movement while platform pricing covers the control
              plane around it.
            </p>
          </div>

          <div className="rounded-[2.4rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.06)] sm:p-10">
            <div className="space-y-4">
              {usageRows.map((row) => (
                <div
                  key={row.title}
                  className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-[#fbfaf7] px-5 py-5 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="text-base font-semibold text-slate-950">{row.title}</div>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{row.body}</p>
                  </div>
                  <div className="text-right text-lg font-semibold tracking-[-0.03em] text-slate-950">
                    {row.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-[1480px] rounded-[2.4rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.06)] sm:p-10">
          <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Comparison</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">What changes by plan.</h2>
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  <th className="rounded-tl-[1.4rem] border border-slate-200 bg-[#fbfaf7] px-5 py-4 font-medium text-slate-500">
                    Capability
                  </th>
                  <th className="border border-slate-200 bg-[#fbfaf7] px-5 py-4 font-medium text-slate-500">
                    Starter
                  </th>
                  <th className="border border-slate-200 bg-[#fbfaf7] px-5 py-4 font-medium text-slate-500">
                    Growth
                  </th>
                  <th className="rounded-tr-[1.4rem] border border-slate-200 bg-[#fbfaf7] px-5 py-4 font-medium text-slate-500">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, index) => (
                  <tr key={row[0]}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${row[0]}-${cellIndex}`}
                        className={`border border-t-0 border-slate-200 px-5 py-4 text-slate-700 ${
                          index === comparisonRows.length - 1 && cellIndex === 0 ? "rounded-bl-[1.4rem]" : ""
                        } ${
                          index === comparisonRows.length - 1 && cellIndex === row.length - 1 ? "rounded-br-[1.4rem]" : ""
                        } ${cellIndex === 0 ? "font-medium text-slate-950" : ""}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-[1480px] grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2.4rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.06)] sm:p-10">
            <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">When to choose what</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">A practical selection rule.</h2>
            <div className="mt-6 space-y-4">
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fbfaf7] p-5">
                <div className="text-base font-semibold text-slate-950">Choose Starter</div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  when you are validating the core collection and payout flow and need the gateway
                  surface without platform overhead.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fbfaf7] p-5">
                <div className="text-base font-semibold text-slate-950">Choose Growth</div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  when operations, callbacks, reconciliation, and support responsiveness begin to
                  matter as much as the payment API itself.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fbfaf7] p-5">
                <div className="text-base font-semibold text-slate-950">Choose Enterprise</div>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  when you need negotiated commercials, rollout planning, and a clear operational
                  escalation path around significant payment volume.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[2.4rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.06)] sm:p-10">
            <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">FAQ</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Questions teams usually ask first.</h2>
            <div className="mt-6 space-y-4">
              {faqs.map((item) => (
                <article key={item.question} className="rounded-[1.5rem] border border-slate-200 bg-[#fbfaf7] p-5">
                  <h3 className="text-base font-semibold text-slate-950">{item.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-16 pt-8 sm:px-8 lg:pb-20">
        <div className="mx-auto max-w-[1480px] rounded-[2.6rem] bg-[#0e1a2b] px-8 py-10 text-white shadow-[0_24px_80px_rgba(7,16,25,0.22)] sm:px-12 sm:py-12">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-sky-300">Next step</div>
              <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.05em]">
                Start with the standalone gateway surface, then contract around real volume.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                If you already know the flows you need, move into onboarding. If you still need to
                validate the technical contract, review the docs before pricing discussions.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-sky-50"
              >
                Create account
              </Link>
              <Link
                href="/docs"
                className="rounded-full border border-white/15 px-5 py-3 text-sm text-slate-100 transition hover:border-white/30 hover:bg-white/5"
              >
                Read documentation
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
