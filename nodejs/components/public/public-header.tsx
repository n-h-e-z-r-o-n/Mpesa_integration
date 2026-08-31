"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Props = {
  actions?: Array<{
    href: string;
    label: string;
    variant: "primary" | "secondary";
  }>;
  brandHref?: string;
  hideSignIn?: boolean;
  navigation?: Array<{
    href: string;
    label: string;
  }>;
};

const defaultNavigation = [
  { href: "/#products", label: "Products" },
  { href: "/#developers", label: "Developers" },
  { href: "/#solutions", label: "Solutions" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#company", label: "Company" },
];

export function PublicHeader({
  actions,
  brandHref = "/",
  hideSignIn = false,
  navigation = defaultNavigation,
}: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const resolvedActions =
    actions ??
    [
      ...(hideSignIn
        ? []
        : [{ href: "/login", label: "Sign in", variant: "secondary" as const }]),
      { href: "/signup", label: "Get started", variant: "primary" as const },
    ];

  function isActive(href: string) {
    const path = href.split("#")[0] || "/";
    return path === pathname && !href.includes("#");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#071019]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href={brandHref} className="flex items-center gap-3 text-white">
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
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300 ${
                isActive(item.href) ? "text-white" : "text-slate-300 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {resolvedActions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={`rounded-full px-4 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300 ${
                action.variant === "primary"
                  ? "bg-[#eef4ff] font-medium text-slate-950 hover:bg-white"
                  : "border border-white/15 text-slate-100 hover:border-white/30 hover:bg-white/5"
              }`}
            >
              {action.label}
            </Link>
          ))}
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
            {resolvedActions.map((action) => (
              <Link
                key={`${action.href}-${action.label}-mobile`}
                href={action.href}
                onClick={() => setOpen(false)}
                className={`mt-2 rounded-2xl px-3 py-2 text-sm ${
                  action.variant === "primary"
                    ? "bg-[#eef4ff] font-medium text-slate-950"
                    : "border border-white/15 text-slate-100"
                }`}
              >
                {action.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
