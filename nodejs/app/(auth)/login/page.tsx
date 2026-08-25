import { PublicHeader } from "@/components/public/public-header";
import { LoginBrandPanel } from "@/components/public/login-brand-panel";
import { LoginForm } from "@/components/forms/login-form";
import { getAdminSession } from "@/lib/auth/admin-session";

export default async function LoginPage() {
  const session = await getAdminSession();

  return (
    <div className="min-h-screen bg-[#071019] text-white">
      <PublicHeader hideSignIn />
      <main className="px-5 py-8 sm:px-8 lg:py-10">
        <div className="mx-auto grid min-h-[calc(100vh-120px)] max-w-[1480px] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <LoginBrandPanel />

          <section className="flex items-center justify-center rounded-[2.5rem] bg-[#f7f3ec] p-6 text-slate-950 sm:p-8 lg:p-10">
            <div className="w-full max-w-md">
              <LoginForm signedInEmail={session?.email ?? null} />
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
