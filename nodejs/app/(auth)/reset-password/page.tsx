import { AuthShell } from "@/components/public/auth-shell";
import { LoginBrandPanel } from "@/components/public/login-brand-panel";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";

export default function ResetPasswordPage() {
  const supabaseUrl = process.env.SUPABASE_URL ?? "";
  const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";

  return (
    <AuthShell visual={<LoginBrandPanel />}>
      <ResetPasswordForm
        supabaseUrl={supabaseUrl}
        supabasePublishableKey={supabasePublishableKey}
      />
    </AuthShell>
  );
}
