import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppUserRole = "admin" | "user";

export type AuthenticatedAppUser = {
  dashboardRoute: string;
  dashboardType: string;
  email: string;
  id: string;
  role: AppUserRole;
  status: string;
};

type DashboardRpcResult = string | null;
type UserRow = {
  email: string;
  id: string;
  role: AppUserRole;
  status: string;
};

export async function getAuthenticatedAppUser(): Promise<AuthenticatedAppUser | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const [{ data: userRow, error: userError }, { data: dashboardRoute }, { data: dashboardType }] =
    await Promise.all([
      supabase
        .from("users")
        .select("id, email, role, status")
        .eq("auth_provider", "supabase")
        .eq("auth_subject", authUser.id)
        .maybeSingle<UserRow>(),
      supabase.rpc("resolve_dashboard_route"),
      supabase.rpc("resolve_dashboard_type"),
    ]);

  if (userError) {
    throw new Error(userError.message);
  }

  if (!userRow) {
    return null;
  }

  return {
    dashboardRoute: normalizeDashboardRoute(dashboardRoute),
    dashboardType: dashboardType ?? "onboarding",
    email: userRow.email,
    id: userRow.id,
    role: userRow.role,
    status: userRow.status,
  };
}

function normalizeDashboardRoute(route: DashboardRpcResult) {
  if (route === "/admin/dashboard" || route === "/app/dashboard" || route === "/signup") {
    return route;
  }

  return "/app/dashboard";
}

export async function requireAuthenticatedAppUser() {
  const user = await getAuthenticatedAppUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireMerchantUser() {
  const user = await requireAuthenticatedAppUser();

  if (user.role === "admin") {
    redirect("/admin/dashboard");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireAuthenticatedAppUser();

  if (user.role !== "admin") {
    redirect("/login");
  }

  return user;
}
