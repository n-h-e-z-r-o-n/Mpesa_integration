import { LoginForm } from "@/components/forms/login-form";
import { AuthShell } from "@/components/public/auth-shell";
import { AuthBrandPanel } from "@/components/public/login-brand-panel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function CodexPreviewLoginSessionPage() {
  return (
    <AuthShell
      visual={
        <AuthBrandPanel
          headline="Move money with confidence."
          description="Manage collections, payouts, and payment operations from one workspace."
        />
      }
    >
      <LoginForm
        signedInEmail="hezron.w12@gmail.com"
        dashboardRoute="/app/dashboard"
        supabaseUrl={process.env.SUPABASE_URL ?? ""}
        supabasePublishableKey={process.env.SUPABASE_PUBLISHABLE_KEY ?? ""}
      />
    </AuthShell>
  );
}
