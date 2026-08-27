import Link from "next/link";

function PlannedLink({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2 text-sm text-slate-500">
      {label}
      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
        Planned
      </span>
    </span>
  );
}

export function PublicFooter() {
  return (
    <footer id="company" className="border-t border-slate-800 bg-[#061019] text-slate-300">
      <div className="mx-auto max-w-[1480px] px-5 py-14 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
              Zadhron Payments
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-400">
              Unified payments infrastructure for collection, disbursement, transaction tracking,
              and operational visibility.
            </p>
          </div>

          <div>
            <h2 className="text-sm font-medium text-white">Product</h2>
            <div className="mt-4 space-y-3">
              <Link href="/#products" className="block text-sm hover:text-white">
                Payments
              </Link>
              <Link href="/#solutions" className="block text-sm hover:text-white">
                Payouts
              </Link>
              <Link href="/#developers" className="block text-sm hover:text-white">
                Transactions
              </Link>
              <Link href="/#pricing" className="block text-sm hover:text-white">
                Monitoring
              </Link>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-white">Developers</h2>
            <div className="mt-4 space-y-3">
              <Link href="/docs" className="block text-sm hover:text-white">
                Documentation
              </Link>
              <PlannedLink label="API reference" />
              <PlannedLink label="Status" />
              <PlannedLink label="Changelog" />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-white">Company</h2>
            <div className="mt-4 space-y-3">
              <a href="https://zadhron.com" className="block text-sm hover:text-white">
                Zadhron
              </a>
              <a href="mailto:hello@zadhron.com" className="block text-sm hover:text-white">
                Contact
              </a>
              <PlannedLink label="About" />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-white">Legal</h2>
            <div className="mt-4 space-y-3">
              <PlannedLink label="Privacy" />
              <PlannedLink label="Terms" />
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-800 pt-6 text-sm text-slate-500">
          Copyright Zadhron
        </div>
      </div>
    </footer>
  );
}
