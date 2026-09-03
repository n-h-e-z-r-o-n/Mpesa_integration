import Image from "next/image";

function BrandRing() {
  return (
    <div className="relative h-12 w-12 rounded-full bg-[conic-gradient(from_210deg,_#8de1ff,_#2690ff,_#1e3a8a,_#8de1ff)] p-[10%]">
      <div className="h-full w-full rounded-full bg-[#0f1b3b]" />
    </div>
  );
}

type AuthBrandPanelProps = {
  description: string;
  eyebrow?: string;
  headline: string;
  supportCopy?: string;
  supportTitle?: string;
};

export function AuthBrandPanel({
  description,
  eyebrow = "Zadhron Pay",
  headline,
  supportCopy = "Collections, payouts, callbacks, and payment operations in one workspace.",
  supportTitle = "Operational visibility built in",
}: AuthBrandPanelProps) {
  return (
    <section className="min-w-0 rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,28,60,0.96)_0%,rgba(11,21,44,0.98)_100%)] p-5 text-white shadow-[0_20px_60px_rgba(6,12,28,0.24)] sm:p-7 lg:min-h-[600px] lg:rounded-[2rem] lg:p-8">
      <div className="max-w-xl">
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
          {eyebrow}
        </div>
        <h1 className="mt-4 text-[1.65rem] font-semibold leading-tight tracking-[-0.05em] text-white sm:text-[2.4rem] lg:text-[2.8rem]">
          {headline}
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-slate-200">{description}</p>
      </div>

      <div className="mt-6 hidden min-w-0 gap-4 sm:grid lg:mt-8 lg:flex-1 lg:grid-rows-[minmax(0,1fr)_auto]">
        <article className="relative min-h-[260px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#10306a] lg:min-h-[360px]">
          <Image
            src="/landing/travel-lifestyle.png"
            alt="Zadhron Payments customer using a phone"
            fill
            className="object-cover"
            sizes="(max-width: 1023px) 100vw, 36vw"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,15,33,0.08)_0%,rgba(6,12,29,0.64)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 p-5 lg:p-6">
            <div className="max-w-[18rem] text-2xl font-medium leading-tight tracking-[-0.05em] text-white">
              Payment operations, kept clear.
            </div>
          </div>
        </article>

        <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(160px,216px)]">
          <article className="min-w-0 rounded-[1.35rem] border border-white/10 bg-white/6 p-4 lg:p-5">
            <div className="flex items-center gap-3">
              <BrandRing />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">
                  Zadhron Payments
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-sky-200">
                  {supportTitle}
                </div>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-200">{supportCopy}</p>
          </article>

          <article className="relative hidden overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/8 md:block">
            <Image
              src="/landing/card-closeup.png"
              alt="Payment card close-up"
              fill
              className="object-cover"
              sizes="216px"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,15,33,0.02)_0%,rgba(6,12,29,0.16)_100%)]" />
          </article>
        </div>
      </div>
    </section>
  );
}

export function LoginBrandPanel() {
  return (
    <AuthBrandPanel
      headline="Move money with confidence."
      description="Manage collections, payouts, and payment operations from one workspace."
    />
  );
}
