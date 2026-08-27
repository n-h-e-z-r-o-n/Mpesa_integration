import { AuthShell } from "@/components/public/auth-shell";
import { LoginBrandPanel } from "@/components/public/login-brand-panel";
import { LoginForm } from "@/components/forms/login-form";
import { getAdminSession } from "@/lib/auth/admin-session";

export default async function LoginPage() {
  const session = await getAdminSession();

  return (
    <AuthShell visual={<LoginBrandPanel />}>
      <LoginForm signedInEmail={session?.email ?? null} />
    </AuthShell>
  );
}
