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

  return (
    <form
      className="w-full max-w-md"
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
      {signedInEmail ? (
        <div className="mb-5 rounded-[1.6rem] border border-sky-300/15 bg-sky-400/8 p-4 text-sm text-slate-700">
          <div className="font-medium text-slate-900">Session already available</div>
          <p className="mt-2 leading-7">
            You are signed in as <span className="mono text-slate-950">{signedInEmail}</span>.
            Continue to your workspace or sign in again with a different account.
          </p>
          <Link
            href={dashboardRoute ?? "/app/dashboard"}
            className="mt-4 inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-900 transition hover:bg-white"
          >
            Continue to dashboard
          </Link>
        </div>
      ) : null}

      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
        Welcome back
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
        Sign in
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Sign in with your Supabase account to access either the merchant workspace or the admin console.
      </p>

      <label className="mt-8 block text-sm text-slate-800">
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
          type="email"
          autoComplete="email"
          required
        />
      </label>

      <label className="mt-4 block text-sm text-slate-800">
        Password
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
          type="password"
          autoComplete="current-password"
          required
        />
      </label>

      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-full bg-[#08111a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#112133] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>

      <p className="mt-4 text-center text-sm text-slate-600">
        <Link href="/reset-password" className="text-slate-950 underline decoration-slate-400 underline-offset-4">
          Forgot your password?
        </Link>
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {["Secure access", "Encrypted session", "Business payments"].map((item) => (
          <div
            key={item}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-700"
          >
            {item}
          </div>
        ))}
      </div>

      <p className="mt-6 text-sm text-slate-600">
        New to Zadhron Payments?{" "}
        <Link href="/signup" className="text-slate-950 underline decoration-slate-400 underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}
