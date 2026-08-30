import { ConsoleShell } from "@/components/layout/shell";
import { requireAdminSession } from "@/lib/auth/admin-session";
import { getGatewayOverview } from "@/services/mpesa/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();
  const overview = await getGatewayOverview();

  return (
    <ConsoleShell
      environment={overview.environment}
      health={overview.providerHealth}
      adminEmail={session.email}
    >
      {children}
    </ConsoleShell>
  );
}
