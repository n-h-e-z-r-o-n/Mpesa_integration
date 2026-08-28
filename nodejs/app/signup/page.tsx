import { PublicSignupForm } from "@/components/forms/public-signup-form";
import { PublicSiteFrame } from "@/components/public/public-site-frame";

export default function SignupPage() {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";

  return (
    <PublicSiteFrame>
      {supabaseUrl && supabasePublishableKey ? (
        <PublicSignupForm
          supabaseUrl={supabaseUrl}
          supabasePublishableKey={supabasePublishableKey}
        />
      ) : (
        <main className="bg-[#f7f3ec] px-5 py-20 text-slate-950 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-[980px] rounded-[2.5rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.08)] sm:p-10">
            <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Configuration</div>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Supabase configuration is missing
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
              Set <span className="mono">SUPABASE_URL</span> and{" "}
              <span className="mono">SUPABASE_PUBLISHABLE_KEY</span> in the environment before using public signup.
            </p>
          </div>
        </main>
      )}
    </PublicSiteFrame>
  );
}
