export function SecuritySection() {
  return (
    <section className="bg-[#08111a] px-5 py-20 text-white sm:px-8 lg:py-24">
      <div className="mx-auto grid max-w-[1480px] gap-10 xl:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-sky-300">Security & Trust</div>
          <h2 className="mt-5 max-w-lg text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Security is handled as infrastructure, not page decoration.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {[
            ["Server-side credential handling", "Consumer secrets, initiator credentials, and session signing stay on the server."],
            ["Scoped application access", "Consuming applications authenticate separately from console users."],
            ["Request validation", "Payloads are validated server-side before payment logic is reached."],
            ["Traceable operations", "Request IDs, provider IDs, and callback events remain linked through the lifecycle."],
          ].map(([title, body]) => (
            <article key={title} className="rounded-[1.8rem] border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-lg font-medium text-white">{title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-300">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
