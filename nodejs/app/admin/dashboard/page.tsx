import { redirect } from "next/navigation";

import { requireAdminUser } from "@/lib/auth/app-session";

export default async function AdminDashboardRoute() {
  await requireAdminUser();
  redirect("/dashboard");
}
