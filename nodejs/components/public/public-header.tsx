"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  hideSignIn?: boolean;
};

const navigation = [
  { href: "/#products", label: "Products" },
  { href: "/#developers", label: "Developers" },
  { href: "/#solutions", label: "Solutions" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#company", label: "Company" },
];

export function PublicHeader({ hideSignIn = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071019]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-3 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-300/40 bg-sky-400/10">
            <span className="h-3 w-3 rounded-full bg-sky-300" />
          </span>
          <span className="text-sm font-semibold tracking-[0.18em] uppercase">Zadhron Payments</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-slate-300 transition hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {!hideSignIn ? (
            <Link
              href="/login"
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-slate-100 transition hover:border-white/30 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
            >
              Sign in
            </Link>
          ) : null}
          <Link
            href="/signup"
            className="rounded-full bg-[#eef4ff] px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white lg:hidden"
        >
          <span className="space-y-1.5">
            <span className="block h-px w-5 bg-current" />
            <span className="block h-px w-5 bg-current" />
          </span>
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 px-5 py-4 lg:hidden">
          <nav className="flex flex-col gap-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/5"
              >
                {item.label}
              </Link>
            ))}
            {!hideSignIn ? (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="mt-2 rounded-2xl border border-white/15 px-3 py-2 text-sm text-slate-100"
              >
                Sign in
              </Link>
            ) : null}
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="rounded-2xl bg-[#eef4ff] px-3 py-2 text-sm font-medium text-slate-950"
            >
              Get started
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
