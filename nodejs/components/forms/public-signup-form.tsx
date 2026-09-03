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

const inputClassName =
  "mt-2 h-12 w-full min-w-0 rounded-[1rem] border border-slate-300 bg-white px-4 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100";

const secondaryButtonClassName =
  "inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
            {step === "details" ? "Create account" : "Verify email"}
          </div>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.35rem]">
            {step === "details" ? "Open your Zadhron Payments workspace" : "Confirm your email"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            {step === "details"
              ? "Set up your account and business details."
              : `Enter the 6-digit code sent to ${values.email.trim()}.`}
          </p>
        </div>

        <div className="shrink-0 rounded-full border border-slate-200 bg-white/70 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-slate-500">
          {step === "details" ? "Step 1 of 2" : "Step 2 of 2"}
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
              setMessage(`Verification code sent to ${values.email.trim()}.`);
            } catch (submissionError) {
              const nextError =
                submissionError instanceof Error
                  ? submissionError.message
                  : "Unable to start account creation right now.";
              setError(nextError);
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="space-y-7">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Account</div>
              <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-800 sm:col-span-2">
                  Full name
                  <input
                    value={values.fullName}
                    onChange={(event) => setValues((current) => ({ ...current, fullName: event.target.value }))}
                    className={inputClassName}
                    type="text"
                    autoComplete="name"
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-slate-800">
                  Email
                  <input
                    value={values.email}
                    onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                    className={inputClassName}
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-slate-800">
                  Phone
                  <input
                    value={values.phone}
                    onChange={(event) => setValues((current) => ({ ...current, phone: event.target.value }))}
                    className={inputClassName}
                    type="tel"
                    autoComplete="tel"
                    placeholder="+254..."
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Business</div>
              <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-800 sm:col-span-2">
                  Business name
                  <input
                    value={values.businessName}
                    onChange={(event) => setValues((current) => ({ ...current, businessName: event.target.value }))}
                    className={inputClassName}
                    type="text"
                    required
                  />
                </label>

                <label className="block text-sm font-medium text-slate-800">
                  Business email
                  <span className="ml-2 text-xs font-normal text-slate-500">Optional</span>
                  <input
                    value={values.businessEmail}
                    onChange={(event) => setValues((current) => ({ ...current, businessEmail: event.target.value }))}
                    className={inputClassName}
                    type="email"
                    autoComplete="email"
                    placeholder="billing@company.com"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-800">
                  Business phone
                  <span className="ml-2 text-xs font-normal text-slate-500">Optional</span>
                  <input
                    value={values.businessPhone}
                    onChange={(event) => setValues((current) => ({ ...current, businessPhone: event.target.value }))}
                    className={inputClassName}
                    type="tel"
                    autoComplete="tel"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-800 sm:max-w-[10rem]">
                  Currency
                  <input
                    value={values.defaultCurrency}
                    onChange={(event) =>
                      setValues((current) => ({ ...current, defaultCurrency: event.target.value.toUpperCase() }))
                    }
                    className={inputClassName}
                    type="text"
                    maxLength={3}
                    pattern="[A-Za-z]{3}"
                    required
                  />
                </label>
              </div>
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Security</div>
              <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-800">
                  Password
                  <div className="relative mt-2">
                    <input
                      value={values.password}
                      onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
                      className={`${inputClassName} mt-0 pr-16`}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
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

                <label className="block text-sm font-medium text-slate-800">
                  Confirm password
                  <div className="relative mt-2">
                    <input
                      value={values.confirmPassword}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, confirmPassword: event.target.value }))
                      }
                      className={`${inputClassName} mt-0 pr-16`}
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-600 transition hover:text-slate-950"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-4 min-h-6" aria-live="polite">
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            {!error && message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#0a1733] px-4 text-sm font-medium text-white transition hover:bg-[#14244a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Creating account..." : "Create account"}
          </button>
        </form>
      ) : (
        <form
          className="mt-8 max-w-[28rem]"
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

              setMessage("Verification confirmed. Finishing setup...");
              await finishRegistration();
            } catch (verificationError) {
              const nextError =
                verificationError instanceof Error
                  ? verificationError.message
                  : "Unable to verify the code right now.";
              setError(nextError);
            } finally {
              setPending(false);
            }
          }}
        >
          <label className="block text-sm font-medium text-slate-800">
            Verification code
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-2 h-14 w-full rounded-[1rem] border border-slate-300 bg-white px-4 text-center text-2xl tracking-[0.34em] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-700 focus:ring-4 focus:ring-sky-100"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              autoFocus
              required
            />
          </label>

          <div className="mt-4 min-h-6" aria-live="polite">
            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            {!error && message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full bg-[#0a1733] px-4 text-sm font-medium text-white transition hover:bg-[#14244a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Verifying..." : "Verify email"}
          </button>

          <div className="mt-5 flex flex-wrap gap-3">
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

                  setMessage(`A new code was sent to ${values.email.trim()}.`);
                } catch (resendError) {
                  const nextError =
                    resendError instanceof Error
                      ? resendError.message
                      : "Unable to resend the code right now.";
                  setError(nextError);
                } finally {
                  setResending(false);
                }
              }}
              className={secondaryButtonClassName}
            >
              {resending ? "Resending..." : "Resend code"}
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
              className={secondaryButtonClassName}
            >
              Edit details
            </button>
          </div>
        </form>
      )}

      <p className="mt-8 text-sm text-slate-600">
        Already have access?{" "}
        <Link href="/login" className="font-medium text-slate-950 transition hover:text-sky-900">
          Sign in
        </Link>
      </p>
    </div>
  );
}
