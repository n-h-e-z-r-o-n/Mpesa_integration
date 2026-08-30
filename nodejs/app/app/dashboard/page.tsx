import { unstable_noStore as noStore } from "next/cache";

import { MerchantDashboard } from "@/components/app/merchant-dashboard";
import { requireMerchantUser } from "@/lib/auth/app-session";
import { getMerchantDashboardSnapshot } from "@/lib/repositories/merchant-dashboard-store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MerchantDashboardPage() {
  noStore();

  const user = await requireMerchantUser();
  const snapshot = await getMerchantDashboardSnapshot({ transactionLimit: 50 });

  return <MerchantDashboard snapshot={snapshot} user={user} />;
}
