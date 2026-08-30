import { readdir } from "node:fs/promises";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";

import { HeroImageRotator } from "@/components/public/hero-image-rotator";
import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { getAuthenticatedAppUser } from "@/lib/auth/app-session";

function BrandRing({ className = "h-24 w-24" }: { className?: string }) {
  return (
    <div
      className={`relative rounded-full bg-[conic-gradient(from_210deg,_#8de1ff,_#2690ff,_#1e3a8a,_#8de1ff)] p-[10%] ${className}`}
    >
      <div className="h-full w-full rounded-full bg-white" />
    </div>
  );
}

function BlueprintRing() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-[#d7e0ee] bg-[#fbfcff]">
      <div className="blueprint-grid absolute inset-6 opacity-65" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[70%] w-[70%]">
          <div className="absolute inset-0 rounded-full border-[28px] border-slate-300/80" />
          <div className="absolute inset-[18%] rounded-full border border-slate-300/80" />
          <div className="absolute inset-[24%] rounded-full border border-slate-300/80" />
          <div className="absolute inset-[30%] rounded-full border border-slate-300/80" />
        </div>
      </div>
      <div className="absolute left-5 top-4 text-[10px] uppercase tracking-[0.18em] text-slate-400">
        Brand Geometry
      </div>
    </div>
  );
}

const quickLinks = ["Collections", "Disbursements", "Business wallets"];

async function getHeroImages() {
  const heroFolder = path.join(process.cwd(), "public", "landing", "img1");
  const fallback = ["/landing/travel-lifestyle.png"];

  try {
    const entries = await readdir(heroFolder, { withFileTypes: true });

    const images = entries
      .filter((entry) => entry.isFile() && /\.(avif|gif|jpe?g|png|webp)$/i.test(entry.name))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
      .map((fileName) => `/landing/img1/${fileName}`);

    return images.length > 0 ? images : fallback;
  } catch {
    return fallback;
  }
}

export default async function HomePage() {
  const session = await getAuthenticatedAppUser();
  const heroImages = await getHeroImages();

  return (
    <PublicSiteFrame>
      <main className="bg-[#1d255a]">
        <section className="px-5 pb-10 pt-8 sm:px-8 lg:pb-16 lg:pt-10">
          <div className="mx-auto max-w-[1540px]">
            {session ? (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[1.6rem] border border-white/12 bg-white/8 px-5 py-4 text-sm text-slate-100">
                    <div>
                  Signed in as <span className="mono text-sky-100">{session.email}</span>
                </div>
                <Link
                  href={session.dashboardRoute}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-[#162457] transition hover:bg-sky-50"
                >
                  Open dashboard
                </Link>
              </div>
            ) : null}

            <section
              id="products"
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.04fr_1.28fr_0.64fr] xl:grid-rows-[12rem_22rem_20rem]"
            >
              <article className="relative min-h-[32rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f6de6] xl:row-span-2 xl:min-h-0">
                <HeroImageRotator
                  images={heroImages}
                  alt="Traveler using Zadhron payments on a phone"
                  sizes="(max-width: 1279px) 100vw, 34vw"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,16,54,0.12)_0%,rgba(6,18,56,0.12)_55%,rgba(5,12,29,0.56)_100%)]" />
                <div className="absolute left-7 right-7 top-7">
                  <div className="text-sm text-sky-100/80">Built for</div>
                  <h1 className="mt-1 text-5xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">
                    Payments
                  </h1>
                </div>
                <div className="absolute bottom-6 left-7 right-7 flex items-end justify-between gap-4">
                  <div>
                    <div className="text-3xl font-semibold tracking-[-0.06em] text-white">
                      Zadhron
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em] text-white/70">
                      Reliable M-Pesa infrastructure
                    </div>
                  </div>
                  <div className="hidden text-xs text-white/70 sm:block">Move money with confidence.</div>
                </div>
              </article>

              <article className="relative flex min-h-[14rem] items-center overflow-hidden rounded-[2rem] border border-white/10 bg-[#fbfbfd] px-7 py-8 text-[#18295d] md:col-span-2 xl:col-span-1 xl:min-h-0">
                <div className="absolute inset-y-0 right-0 w-44 bg-gradient-to-l from-sky-100/80 to-transparent" />
                <div className="relative flex items-center gap-5 sm:gap-7">
                  <BrandRing className="h-20 w-20 sm:h-24 sm:w-24" />
                  <div>
                    <div className="text-4xl font-semibold tracking-[-0.08em] sm:text-6xl">
                      zadhron
                    </div>
                    <div className="mt-2 text-sm uppercase tracking-[0.24em] text-sky-700">
                      pay
                    </div>
                  </div>
                </div>
              </article>

              <article className="relative min-h-[18rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#dbe7f7] xl:min-h-0">
                <Image
                  src="/landing/cap-portrait.png"
                  alt="Fashion portrait with Zadhron branded cap"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1279px) 50vw, 16vw"
                  suppressHydrationWarning
                />
              </article>

              <article className="relative min-h-[18rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#dceeff] xl:min-h-0">
                <Image
                  src="/landing/card-closeup.png"
                  alt="Close-up of a payment card held in hand"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1279px) 50vw, 42vw"
                  suppressHydrationWarning
                />
              </article>

              <article className="relative min-h-[30rem] overflow-hidden rounded-[2rem] border border-white/10 bg-white xl:row-span-2 xl:min-h-0">
                <Image
                  src="/landing/phone-portrait.png"
                  alt="Portrait holding a phone in Zadhron campaign styling"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1279px) 50vw, 26vw"
                  suppressHydrationWarning
                />
                <div className="absolute left-7 top-7 max-w-[12rem] text-[#162457]">
                  <div className="text-3xl font-medium leading-[1.02] tracking-[-0.06em]">
                    Payments made simple for growing businesses.
                  </div>
                </div>
              </article>

              <article className="relative min-h-[16rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[#122a72] md:col-span-1 xl:min-h-0">
                <Image
                  src="/landing/pocket-phone.png"
                  alt="Phone in pocket with abstract Zadhron payment wallpaper"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1279px) 50vw, 34vw"
                  suppressHydrationWarning
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,18,56,0.08)_0%,rgba(5,12,29,0.52)_100%)]" />
                <div className="absolute bottom-6 left-7 max-w-[14rem]">
                  <div className="text-3xl font-medium leading-[1.02] tracking-[-0.06em] text-white">
                    Checkout that feels instant.
                  </div>
                </div>
              </article>

              <article className="min-h-[16rem] xl:min-h-0">
                <BlueprintRing />
              </article>
            </section>

            <section
              id="developers"
              className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] px-6 py-6 sm:px-7"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-sky-200">
                    Zadhron Pay
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-white sm:text-4xl">
                    A refined payment gateway for collection, payout, and business money movement.
                  </h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/signup"
                    className="rounded-full bg-white px-5 py-3 text-sm font-medium text-[#162457] transition hover:bg-sky-50"
                  >
                    Get started
                  </Link>
                  <Link
                    href="/docs"
                    className="rounded-full border border-white/15 px-5 py-3 text-sm text-white transition hover:border-white/30 hover:bg-white/5"
                  >
                    View docs
                  </Link>
                </div>
              </div>

              <div id="solutions" className="mt-6 flex flex-wrap gap-3">
                {quickLinks.map((item) => (
                  <div
                    key={item}
                    className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm text-slate-100"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    </PublicSiteFrame>
  );
}
