const items = [
  ["Authentication", "Separate application authentication from administrator sessions."],
  ["Idempotency", "Prepare payout and money-moving operations for retry-safe execution."],
  ["Structured Errors", "Return normalized gateway errors instead of leaking raw upstream responses."],
  ["Webhooks", "Accept, sanitize, and track callback deliveries as part of transaction lifecycle handling."],
  ["Correlation", "Attach internal request IDs and preserve provider conversation identifiers."],
  ["Auditability", "Retain sanitized operational logs and traceable request metadata."],
];

export function InfrastructureSection() {
  return (
    <section id="pricing" className="bg-[#f0f3f6] px-5 py-20 text-slate-950 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1480px]">
        <div className="max-w-3xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Infrastructure Principles</div>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            The API surface is designed around control, traceability, and clean failure modes.
          </h2>
        </div>

        <div className="mt-10 divide-y divide-slate-200 rounded-[2rem] border border-slate-200 bg-white">
          {items.map(([title, body]) => (
            <div key={title} className="grid gap-4 px-6 py-6 md:grid-cols-[260px_1fr] md:px-8">
              <div className="text-lg font-medium">{title}</div>
              <p className="max-w-3xl text-sm leading-7 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
