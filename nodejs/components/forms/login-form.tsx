"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type Props = {
  dashboardRoute?: string | null;
  signedInEmail?: string | null;
  supabasePublishableKey: string;
  supabaseUrl: string;
};

type LoginRouteResult = {
  dashboard_route?: string | null;
};

const inputClassName =
  "mt-2 h-12 w-full min-w-0 rounded-[1rem] border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100";

const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100";

export function LoginForm({
  dashboardRoute,
  signedInEmail,
  supabasePublishableKey,
  supabaseUrl,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(
    () => getSupabaseBrowserClient(supabaseUrl, supabasePublishableKey),
    [supabasePublishableKey, supabaseUrl],
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [useAnotherAccount, setUseAnotherAccount] = useState(false);

  const showForm = !signedInEmail || useAnotherAccount;

  return (
    <div className="w-full min-w-0">
      {signedInEmail && !showForm ? (
        <section className="mb-8 rounded-[1.35rem] border border-slate-200 bg-white/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-5">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Signed in as</div>
          <div className="mt-2 break-all text-base font-medium text-slate-950">{signedInEmail}</div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={dashboardRoute ?? "/app/dashboard"}
              className="inline-flex items-center justify-center rounded-full bg-[#0a1733] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#14244a]"
            >
              Continue to dashboard
            </Link>
            <button
              type="button"
              onClick={() => setUseAnotherAccount(true)}
              className={secondaryButtonClassName}
            >
              Use another account
            </button>
          </div>
        </section>
      ) : null}

      {showForm ? (
        <>
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Welcome back</div>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.35rem]">
            Sign in to Zadhron Payments
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sign in to continue.
          </p>

          <form
            className="mt-8"
            onSubmit={async (event) => {
              event.preventDefault();
              setPending(true);
              setError(null);

              const { error: loginError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
              });

              if (loginError) {
                setPending(false);
                setError(loginError.message || "Invalid credentials.");
                return;
              }

              const { data: routeData, error: routeError } = await supabase.rpc("resolve_dashboard_route");

              if (routeError) {
                setPending(false);
                setError(routeError.message || "Unable to resolve your dashboard.");
                return;
              }

              const nextRoute =
                ((routeData as LoginRouteResult | null)?.dashboard_route as string | undefined) ||
                (typeof routeData === "string" ? routeData : null) ||
                "/app/dashboard";

              startTransition(() => {
                router.push(nextRoute);
                router.refresh();
              });
            }}
          >
            <div className="space-y-5">
              <label className="block text-sm font-medium text-slate-800">
                Email
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClassName}
                  type="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  autoFocus={!signedInEmail}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-800">
                Password
                <div className="relative mt-2">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={`${inputClassName} mt-0 pr-16`}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
            </div>

            <div className="mt-4 min-h-6" aria-live="polite">
              {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            </div>

            <button
              type="submit"
              disabled={pending}
              className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#0a1733] px-4 text-sm font-medium text-white transition hover:bg-[#14244a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Signing in..." : "Sign in"}
            </button>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
              <Link
                href="/reset-password"
                className="text-slate-600 transition hover:text-slate-950"
              >
                Forgot password?
              </Link>

              {signedInEmail ? (
                <button
                  type="button"
                  onClick={() => setUseAnotherAccount(false)}
                  className="text-slate-600 transition hover:text-slate-950"
                >
                  Use current session
                </button>
              ) : null}
            </div>
          </form>

          <p className="mt-8 text-sm text-slate-600">
            New to Zadhron Payments?{" "}
            <Link href="/signup" className="font-medium text-slate-950 transition hover:text-sky-900">
              Create account
            </Link>
          </p>
        </>
      ) : (
        <p className="text-sm text-slate-600">
          Continue with your current session or switch accounts.
        </p>
      )}
    </div>
  );
}
