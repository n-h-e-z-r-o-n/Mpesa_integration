"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";

type Props = {
  signedInEmail?: string | null;
};

export function LoginForm({ signedInEmail }: Props) {
  const router = useRouter();
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

        const response = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null;
          setPending(false);
          setError(payload?.error?.message ?? "Invalid credentials.");
          return;
        }

        startTransition(() => {
          router.push("/dashboard");
          router.refresh();
        });
      }}
    >
      {signedInEmail ? (
        <div className="mb-5 rounded-[1.6rem] border border-sky-300/15 bg-sky-400/8 p-4 text-sm text-slate-700">
          <div className="font-medium text-slate-900">Session already available</div>
          <p className="mt-2 leading-7">
            Signed in as <span className="mono text-slate-950">{signedInEmail}</span>. You can
            continue into the current console or sign in again.
          </p>
          <Link
            href="/dashboard"
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
        Sign in to Zadhron Payments
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Continue into the current operations environment. Broader customer and developer account
        onboarding is being prepared separately.
      </p>

      <label className="mt-8 block text-sm text-slate-800">
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-900"
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
          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-slate-900"
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
        {pending ? "Signing In..." : "Sign In"}
      </button>

      <p className="mt-6 text-sm text-slate-600">
        New to Zadhron Payments?{" "}
        <Link href="/signup" className="text-slate-950 underline decoration-slate-400 underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}
