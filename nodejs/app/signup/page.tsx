import { AuthShell } from "@/components/public/auth-shell";
import { AuthBrandPanel } from "@/components/public/login-brand-panel";
import { PublicSignupForm } from "@/components/forms/public-signup-form";

export default function SignupPage() {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  const authConfigured = Boolean(supabaseUrl && supabasePublishableKey);

  return (
    <AuthShell
      visual={
        <AuthBrandPanel
          headline="Set up your payments workspace."
          description="Create your account, verify your email, and start managing payment operations."
          supportTitle="Built for daily operations"
          supportCopy="Start with account setup, then move into collections, payouts, and M-Pesa workflows."
        />
      }
    >
      {authConfigured ? (
        <PublicSignupForm
          supabaseUrl={supabaseUrl}
          supabasePublishableKey={supabasePublishableKey}
        />
      ) : (
        <div className="w-full min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Authentication</div>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.35rem]">
            Account creation is unavailable
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Authentication is not configured for this environment.
          </p>
          <div className="mt-8 rounded-[1.25rem] border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
            Set <span className="mono text-slate-950">SUPABASE_URL</span> and{" "}
            <span className="mono text-slate-950">SUPABASE_PUBLISHABLE_KEY</span> before enabling signup.
          </div>
        </div>
      )}
    </AuthShell>
  );
}
