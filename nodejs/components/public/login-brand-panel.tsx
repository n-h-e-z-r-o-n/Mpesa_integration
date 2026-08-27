import Image from "next/image";
import Link from "next/link";

function BrandRing() {
  return (
    <div className="relative h-16 w-16 rounded-full bg-[conic-gradient(from_210deg,_#8de1ff,_#2690ff,_#1e3a8a,_#8de1ff)] p-[10%]">
      <div className="h-full w-full rounded-full bg-white" />
    </div>
  );
}

const trustCues = ["Secure access", "Encrypted sessions", "Business payments"];

export function LoginBrandPanel() {
  return (
    <section className="flex h-full flex-col rounded-[2.5rem] bg-[#162457] p-6 text-white sm:p-8 lg:p-10">
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-200">
          Zadhron Pay
        </div>
        <h1 className="mt-7 max-w-xl text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
          Access your payment workspace.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-8 text-slate-200">
          Manage collections, disbursements, and business money movement from one
          trusted platform.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          {trustCues.map((item) => (
            <div
              key={item}
              className="rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-slate-100"
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid flex-1 gap-4 xl:grid-cols-[1.06fr_0.94fr]">
        <article className="relative min-h-[24rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f6de6]">
          <Image
            src="/landing/travel-lifestyle.png"
            alt="Traveler using Zadhron payments on a phone"
            fill
            className="object-cover"
            sizes="(max-width: 1279px) 100vw, 28vw"
            priority
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,20,58,0.08)_0%,rgba(5,12,29,0.58)_100%)]" />
          <div className="absolute bottom-6 left-6 right-6">
            <div className="max-w-[16rem] text-3xl font-medium leading-[1.02] tracking-[-0.06em] text-white">
              Collections and payouts in one place.
            </div>
          </div>
        </article>

        <div className="grid gap-4">
          <article className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#fbfbfd] px-6 py-7 text-[#18295d]">
            <div className="absolute inset-y-0 right-0 w-28 bg-gradient-to-l from-sky-100/80 to-transparent" />
            <div className="relative flex items-center gap-4">
              <BrandRing />
              <div>
                <div className="text-3xl font-semibold tracking-[-0.08em]">zadhron</div>
                <div className="mt-1 text-sm uppercase tracking-[0.22em] text-sky-700">pay</div>
              </div>
            </div>
          </article>

          <article className="relative min-h-[14rem] overflow-hidden rounded-[2rem] border border-white/10 bg-white">
            <Image
              src="/landing/card-closeup.png"
              alt="Close-up of a payment card held in hand"
              fill
              className="object-cover"
              sizes="(max-width: 1279px) 100vw, 22vw"
            />
          </article>

          <article className="rounded-[2rem] border border-white/10 bg-white/6 p-6">
            <div className="text-[11px] uppercase tracking-[0.18em] text-sky-200">
              Trusted M-Pesa operations
            </div>
            <div className="mt-4 text-2xl font-semibold tracking-[-0.05em] text-white">
              Built for teams that move money every day.
            </div>
          </article>
        </div>
      </div>

      <div className="mt-8 text-sm text-slate-300">
        Need the product overview first?{" "}
        <Link href="/" className="text-white underline decoration-white/30 underline-offset-4">
          Return to the homepage
        </Link>
      </div>
    </section>
  );
}
