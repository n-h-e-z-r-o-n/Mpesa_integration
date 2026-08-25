import Link from "next/link";

type Props = {
  label: string;
  title: string;
  body: string;
};

export function PlaceholderPage({ label, title, body }: Props) {
  return (
    <main className="bg-[#f7f3ec] px-5 py-20 text-slate-950 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[980px] rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.08)] sm:p-10">
        <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">{label}</div>
        <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">{body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full bg-[#08111a] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#102034]"
          >
            Sign in
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-300 px-5 py-3 text-sm text-slate-900 transition hover:bg-slate-50"
          >
            Back to site
          </Link>
        </div>
      </div>
    </main>
  );
}
