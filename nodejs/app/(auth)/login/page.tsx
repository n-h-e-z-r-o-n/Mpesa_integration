import { AuthShell } from "@/components/public/auth-shell";
import { AuthBrandPanel } from "@/components/public/login-brand-panel";
import { LoginForm } from "@/components/forms/login-form";
import { getAuthenticatedAppUser } from "@/lib/auth/app-session";

export default async function LoginPage() {
  const session = await getAuthenticatedAppUser();
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
  const authConfigured = Boolean(supabaseUrl && supabasePublishableKey);

  return (
    <AuthShell
      visual={
        <AuthBrandPanel
          headline="Move money with confidence."
          description="Manage collections, payouts, and payment operations from one workspace."
        />
      }
    >
      {authConfigured ? (
        <LoginForm
          signedInEmail={session?.email ?? null}
          dashboardRoute={session?.dashboardRoute ?? null}
          supabaseUrl={supabaseUrl}
          supabasePublishableKey={supabasePublishableKey}
        />
      ) : (
        <div className="w-full min-w-0">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Authentication</div>
          <h1 className="mt-2 text-[2rem] font-semibold tracking-[-0.05em] text-slate-950 sm:text-[2.35rem]">
            Sign-in is unavailable
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
            Authentication is not configured for this environment.
          </p>
          <div className="mt-8 rounded-[1.25rem] border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
            Set <span className="mono text-slate-950">SUPABASE_URL</span> and{" "}
            <span className="mono text-slate-950">SUPABASE_PUBLISHABLE_KEY</span> before using sign-in.
          </div>
        </div>
      )}
    </AuthShell>
  );
}
