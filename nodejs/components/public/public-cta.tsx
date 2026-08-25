import Link from "next/link";

export function PublicCta() {
  return (
    <section className="bg-[#f7f3ec] px-5 py-20 text-slate-950 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1480px] rounded-[2.5rem] bg-[#08111a] px-8 py-12 text-white sm:px-12 lg:flex lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="text-[11px] uppercase tracking-[0.18em] text-sky-300">Next Step</div>
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Build payments into your product.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
            Start with the current gateway surface today and prepare for a broader Zadhron Payments
            platform as public onboarding expands.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 lg:mt-0">
          <Link
            href="/signup"
            className="rounded-full bg-[#eef4ff] px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-white"
          >
            Create account
          </Link>
          <Link
            href="/docs"
            className="rounded-full border border-white/15 px-5 py-3 text-sm text-slate-100 transition hover:border-white/30 hover:bg-white/5"
          >
            Read the docs
          </Link>
        </div>
      </div>
    </section>
  );
}
