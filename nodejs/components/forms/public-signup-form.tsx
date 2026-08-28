"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type Props = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

type RegistrationResult = {
  dashboard_route?: string | null;
  dashboard_type?: string | null;
  merchant_id?: string | null;
  user_id?: string | null;
};

type FormValues = {
  fullName: string;
  email: string;
  phone: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  defaultCurrency: string;
  password: string;
  confirmPassword: string;
};

const initialValues: FormValues = {
  fullName: "",
  email: "",
  phone: "",
  businessName: "",
  businessEmail: "",
  businessPhone: "",
  defaultCurrency: "KES",
  password: "",
  confirmPassword: "",
};

export function PublicSignupForm({ supabaseUrl, supabasePublishableKey }: Props) {
  const router = useRouter();
  const supabase = useMemo(
    () => getSupabaseBrowserClient(supabaseUrl, supabasePublishableKey),
    [supabasePublishableKey, supabaseUrl],
  );

  const [values, setValues] = useState<FormValues>(initialValues);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"details" | "otp">("details");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);

  const startSignup = async () => {
    const { error: authError } = await supabase.auth.signUp({
      email: values.email.trim(),
      password: values.password,
      options: {
        data: {
          full_name: values.fullName.trim(),
          phone: values.phone.trim() || undefined,
        },
      },
    });

    if (authError) {
      throw authError;
    }
  };

  const finishRegistration = async () => {
    const { data, error: rpcError } = await supabase.rpc("register_new_user", {
      p_full_name: values.fullName.trim(),
      p_phone: values.phone.trim() || null,
      p_business_name: values.businessName.trim(),
      p_business_email: values.businessEmail.trim() || null,
      p_business_phone: values.businessPhone.trim() || null,
      p_default_currency: values.defaultCurrency.trim().toUpperCase(),
    });

    if (rpcError) {
      throw rpcError;
    }

    const result = (Array.isArray(data) ? data[0] : data) as RegistrationResult | null;
    const nextRoute = result?.dashboard_route || "/app/dashboard";

    startTransition(() => {
      router.push(nextRoute);
      router.refresh();
    });
  };

  return (
    <main className="bg-[#f7f3ec] px-5 py-16 text-slate-950 sm:px-8 lg:py-20">
      <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-[0.96fr_1.04fr]">
        <section className="rounded-[2.5rem] bg-[#0f1f33] p-8 text-white shadow-[0_24px_70px_rgba(7,16,25,0.2)] sm:p-10">
          <div className="text-[11px] uppercase tracking-[0.18em] text-sky-200">Public onboarding</div>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] sm:text-5xl">
            Create your payment gateway workspace
          </h1>
          <p className="mt-6 max-w-xl text-sm leading-7 text-slate-200/88">
            Register your merchant account, verify the one-time code, then access your dashboard and API tools.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {[
              "Single merchant account per user",
              "OTP verification before activation",
              "Dashboard access after registration",
              "API-ready onboarding for gateway usage",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[1.5rem] border border-white/12 bg-white/6 px-4 py-4 text-sm text-slate-100"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-[1.75rem] border border-white/10 bg-white/6 p-5">
            <div className="text-[11px] uppercase tracking-[0.16em] text-sky-200">Verification</div>
            <p className="mt-3 text-sm leading-7 text-slate-100/88">
              This flow creates the password first, then confirms the account with an email OTP. Your Supabase email template must send a token code, not only a magic link.
            </p>
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.08)] sm:p-10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-sky-700">
                {step === "details" ? "Step 1 of 2" : "Step 2 of 2"}
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                {step === "details" ? "Business details" : "Verify your OTP"}
              </h2>
            </div>
            <div className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-600">
              {step === "details" ? "Profile" : "Confirmation"}
            </div>
          </div>

          {step === "details" ? (
            <form
              className="mt-8"
              onSubmit={async (event) => {
                event.preventDefault();
                setPending(true);
                setError(null);
                setMessage(null);

                try {
                  if (values.password.length < 8) {
                    throw new Error("Password must be at least 8 characters.");
                  }

                  if (values.password !== values.confirmPassword) {
                    throw new Error("Password confirmation does not match.");
                  }

                  await startSignup();
                  setStep("otp");
                  setMessage(`We created your account and sent a verification code to ${values.email.trim()}.`);
                } catch (submissionError) {
                  const nextError =
                    submissionError instanceof Error
                      ? submissionError.message
                      : "Unable to start signup right now.";
                  setError(nextError);
                } finally {
                  setPending(false);
                }
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm text-slate-800 sm:col-span-2">
                  Full name
                  <input
                    value={values.fullName}
                    onChange={(event) => setValues((current) => ({ ...current, fullName: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
                    type="text"
                    autoComplete="name"
                    required
                  />
                </label>

                <label className="block text-sm text-slate-800">
                  Email
                  <input
                    value={values.email}
                    onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
                    type="email"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="block text-sm text-slate-800">
                  Phone
                  <input
                    value={values.phone}
                    onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+254..."
                  />
                </label>

                <label className="block text-sm text-slate-800 sm:col-span-2">
                  Business name
                  <input
                    value={values.businessName}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, businessName: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
                    type="text"
                    required
                  />
                </label>

                <label className="block text-sm text-slate-800">
                  Business email
                  <input
                    value={values.businessEmail}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, businessEmail: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
                    type="email"
                    autoComplete="email"
                  />
                </label>

                <label className="block text-sm text-slate-800">
                  Business phone
                  <input
                    value={values.businessPhone}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, businessPhone: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
                    type="tel"
                    autoComplete="tel"
                  />
                </label>

                <label className="block text-sm text-slate-800 sm:col-span-2">
                  Default currency
                  <input
                    value={values.defaultCurrency}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, defaultCurrency: event.target.value.toUpperCase() }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
                    type="text"
                    maxLength={3}
                    pattern="[A-Za-z]{3}"
                    required
                  />
                </label>

                <label className="block text-sm text-slate-800">
                  Password
                  <input
                    value={values.password}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, password: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>

                <label className="block text-sm text-slate-800">
                  Confirm password
                  <input
                    value={values.confirmPassword}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-sky-700"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
              </div>

              {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
              {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}

              <button
                type="submit"
                disabled={pending}
                className="mt-8 w-full rounded-full bg-[#08111a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#112133] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Creating account..." : "Create account and send OTP"}
              </button>
            </form>
          ) : (
            <form
              className="mt-8"
              onSubmit={async (event) => {
                event.preventDefault();
                setPending(true);
                setError(null);
                setMessage(null);

                try {
                  const { error: verifyError } = await supabase.auth.verifyOtp({
                    email: values.email.trim(),
                    token: otp.trim(),
                    type: "email",
                  });

                  if (verifyError) {
                    throw verifyError;
                  }

                  setMessage("Verification succeeded. Finalizing your merchant workspace...");
                  await finishRegistration();
                } catch (verificationError) {
                  const nextError =
                    verificationError instanceof Error
                      ? verificationError.message
                      : "Unable to verify the OTP right now.";
                  setError(nextError);
                } finally {
                  setPending(false);
                }
              }}
            >
              <label className="block text-sm text-slate-800">
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

              <p className="mt-4 text-sm leading-7 text-slate-600">
                Enter the verification code sent to <span className="mono text-slate-950">{values.email.trim()}</span>.
              </p>

              {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
              {message ? <p className="mt-4 text-sm text-emerald-700">{message}</p> : null}

              <button
                type="submit"
                disabled={pending}
                className="mt-8 w-full rounded-full bg-[#08111a] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#112133] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? "Verifying..." : "Verify OTP"}
              </button>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={pending || resending}
                  onClick={async () => {
                    setResending(true);
                    setError(null);
                    setMessage(null);

                    try {
                      const { error: resendError } = await supabase.auth.resend({
                        type: "signup",
                        email: values.email.trim(),
                      });

                      if (resendError) {
                        throw resendError;
                      }

                      setMessage(`A new verification code was sent to ${values.email.trim()}.`);
                    } catch (resendError) {
                      const nextError =
                        resendError instanceof Error
                          ? resendError.message
                          : "Unable to resend the OTP right now.";
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
                    setStep("details");
                    setOtp("");
                    setError(null);
                    setMessage(null);
                  }}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Edit details
                </button>
              </div>
            </form>
          )}

          <p className="mt-8 text-sm text-slate-600">
            Already have access?{" "}
            <Link href="/login" className="text-slate-950 underline decoration-slate-400 underline-offset-4">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
