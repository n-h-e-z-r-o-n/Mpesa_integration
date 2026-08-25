const capabilities = [
  {
    title: "Collect",
    body: "Accept money into applications through supported collection flows and callback handling.",
    tone: "bg-white text-slate-950 border border-slate-200",
  },
  {
    title: "Send",
    body: "Initiate controlled payouts and disbursements across the gateway's authenticated M-Pesa operation surface.",
    tone: "bg-[#0c1725] text-white",
  },
  {
    title: "Verify",
    body: "Query transaction state, inspect provider codes, and reconcile outcomes with a normalized response model.",
    tone: "bg-[#dfe8f7] text-slate-950",
  },
  {
    title: "Monitor",
    body: "Observe request logs, callbacks, transaction lifecycles, and provider health through a shared operational layer.",
    tone: "bg-[#f4efe4] text-slate-950",
  },
];

export function CapabilitySection() {
  return (
    <section id="products" className="bg-[#f7f3ec] px-5 py-20 text-slate-950 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1480px]">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Platform Capabilities</div>
          <h2 id="capabilities" className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Payments infrastructure shaped around real gateway work.
          </h2>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {capabilities.map((capability, index) => (
            <article
              key={capability.title}
              className={`rounded-[2.2rem] p-8 ${capability.tone} ${index === 0 ? "lg:min-h-[320px]" : ""} ${index === 1 ? "lg:min-h-[360px]" : ""}`}
            >
              <div className="text-[11px] uppercase tracking-[0.18em] opacity-70">0{index + 1}</div>
              <h3 className="mt-8 text-3xl font-semibold tracking-[-0.04em]">{capability.title}</h3>
              <p className="mt-5 max-w-lg text-base leading-8 opacity-80">{capability.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
