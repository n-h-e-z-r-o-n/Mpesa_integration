import type { ReactNode } from "react";

import { PublicHeader } from "@/components/public/public-header";

type Props = {
  children: ReactNode;
  visual: ReactNode;
};

export function AuthShell({ children, visual }: Props) {
  return (
    <div className="min-h-screen bg-[#1d255a] text-white">
      <PublicHeader hideSignIn />
      <main className="px-5 py-8 sm:px-8 lg:py-10">
        <div className="mx-auto grid min-h-[calc(100vh-120px)] max-w-[1540px] gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          {visual}

          <section className="flex items-center justify-center rounded-[2.5rem] border border-white/10 bg-[#fbf7f1] p-6 text-slate-950 shadow-[0_24px_80px_rgba(7,16,25,0.18)] sm:p-8 lg:p-10">
            <div className="w-full max-w-md">{children}</div>
          </section>
        </div>
      </main>
    </div>
  );
}
