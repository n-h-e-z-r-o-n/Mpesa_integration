import { NextResponse } from "next/server";

import { adminCookie } from "@/lib/auth/admin-session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(adminCookie.name, "", { ...adminCookie.options, maxAge: 0 });
  return response;
}
