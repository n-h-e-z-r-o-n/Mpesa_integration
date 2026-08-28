export async function getAdminSession() {
  const { getAuthenticatedAppUser } = await import("@/lib/auth/app-session");
  const user = await getAuthenticatedAppUser();

  if (!user || user.role !== "admin") {
    return null;
  }

  return {
    email: user.email,
    id: user.id,
    role: user.role,
  };
}

export async function requireAdminSession() {
  const { requireAdminUser } = await import("@/lib/auth/app-session");
  const user = await requireAdminUser();

  return {
    email: user.email,
    id: user.id,
    role: user.role,
  };
}
