import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin-session";
import { listStoredCallbacks } from "@/lib/repositories/callback-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const callbacks = (await listStoredCallbacks().catch(() => null)) ?? [];
  return NextResponse.json(callbacks);
}
