"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type Props = {
  supabasePublishableKey: string;
  supabaseUrl: string;
};

export function ResetPasswordForm({ supabasePublishableKey, supabaseUrl }: Props) {
  const router = useRouter();
  const supabase = useMemo(
    () => getSupabaseBrowserClient(supabaseUrl, supabasePublishableKey),
    [supabasePublishableKey, supabaseUrl],
  );

  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function sendRecoveryEmail() {
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (resetError) {
      throw resetError;
    }
  }

  return (
    <form
      className="w-full max-w-md"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setMessage(null);

        try {
          if (step === "email") {
            await sendRecoveryEmail();
            setStep("otp");
            setMessage(`If ${email.trim()} exists, a recovery code has been sent.`);
            return;
          }

          if (step === "otp") {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              email: email.trim(),
              token: otp.trim(),
              type: "recovery",
            });

            if (verifyError) {
              throw verifyError;
            }

            setStep("password");
            setMessage("Recovery code verified. Set your new password.");
            return;
          }

          if (password.length < 8) {
            throw new Error("Password must be at least 8 characters.");
          }

          if (password !== confirmPassword) {
            throw new Error("Password confirmation does not match.");
          }

          const { error: updateError } = await supabase.auth.updateUser({
            password,
          });

          if (updateError) {
            throw updateError;
          }

          setMessage("Password updated successfully. Redirecting to sign in...");
          startTransition(() => {
            router.push("/login");
            router.refresh();
          });
        } catch (submissionError) {
          const nextError =
            submissionError instanceof Error
              ? submissionError.message
              : "Unable to complete password reset right now.";
          setError(nextError);
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
        {step === "email" ? "Step 1 of 3" : step === "otp" ? "Step 2 of 3" : "Step 3 of 3"}
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
        Reset password
      </h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        {step === "email"
          ? "Enter your email and request a password recovery code."
          : step === "otp"
            ? "Enter the recovery OTP sent to your email address."
            : "Choose a new password for your Supabase account."}
      </p>

      {step === "email" ? (
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
      ) : null}

      {step === "otp" ? (
        <>
          <label className="mt-8 block text-sm text-slate-800">
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="mt-4 block text-sm text-slate-800">
            OTP code
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl tracking-[0.38em] text-slate-950 outline-none transition focus:border-sky-700"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              required
            />
          </label>
        </>
      ) : null}

      {step === "password" ? (
        <>
          <label className="mt-8 block text-sm text-slate-800">
            New password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>

          <label className="mt-4 block text-sm text-slate-800">
            Confirm new password
            <input
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
        </>
      ) : null}

      {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 w-full rounded-full bg-[#08111a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#112133] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending
          ? step === "email"
            ? "Sending recovery code..."
            : step === "otp"
              ? "Verifying OTP..."
              : "Updating password..."
          : step === "email"
            ? "Send recovery OTP"
            : step === "otp"
              ? "Verify OTP"
              : "Update password"}
      </button>

      {step === "otp" ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending || resending}
            onClick={async () => {
              setResending(true);
              setError(null);
              setMessage(null);

              try {
                await sendRecoveryEmail();
                setMessage(`If ${email.trim()} exists, a new recovery code has been sent.`);
              } catch (resendError) {
                const nextError =
                  resendError instanceof Error
                    ? resendError.message
                    : "Unable to resend the recovery code.";
                setError(nextError);
              } finally {
                setResending(false);
              }
            }}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resending ? "Resending..." : "Resend OTP"}
          </button>

          <button
            type="button"
            disabled={pending || resending}
            onClick={() => {
              setStep("email");
              setOtp("");
              setError(null);
              setMessage(null);
            }}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Change email
          </button>
        </div>
      ) : null}

      <p className="mt-6 text-sm text-slate-600">
        Back to{" "}
        <Link href="/login" className="text-slate-950 underline decoration-slate-400 underline-offset-4">
          sign in
        </Link>
      </p>
    </form>
  );
}
