import type { ReactNode } from "react";
import Link from "next/link";

type Props = {
  children: ReactNode;
  visual: ReactNode;
};

function BrandMark() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-sky-300/30 bg-sky-300/10">
      <span className="h-3 w-3 rounded-full bg-sky-200" />
    </span>
  );
}

export function AuthShell({ children, visual }: Props) {
  return (
    <div className="min-h-screen overflow-x-clip bg-[linear-gradient(180deg,#111d43_0%,#0b1430_48%,#081020_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] min-w-0 flex-col px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5 lg:px-8 lg:pb-8 lg:pt-6">
        <header className="flex min-w-0 items-center justify-between gap-4">
          <Link href="/" className="inline-flex min-w-0 items-center gap-3 text-white">
            <BrandMark />
            <span className="truncate text-[13px] font-semibold uppercase tracking-[0.16em] sm:text-sm sm:tracking-[0.18em]">
              Zadhron Payments
            </span>
          </Link>

          <Link
            href="/"
            className="shrink-0 rounded-full border border-white/12 px-3.5 py-2 text-sm text-slate-200 transition hover:border-white/25 hover:bg-white/5 hover:text-white"
          >
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to website</span>
          </Link>
        </header>

        <main className="flex min-w-0 flex-1 items-start py-4 sm:py-6 lg:items-center lg:py-8">
          <div className="grid w-full min-w-0 gap-4 lg:items-center lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1fr)] xl:gap-6">
            <div className="min-w-0">{visual}</div>

            <section className="min-w-0 rounded-[1.75rem] border border-white/10 bg-[#f6f3ec] px-5 py-6 text-slate-950 shadow-[0_24px_70px_rgba(5,10,24,0.24)] sm:px-7 sm:py-7 lg:rounded-[2rem] lg:px-10 lg:py-9">
              <div className="mx-auto w-full max-w-[560px] min-w-0">{children}</div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
