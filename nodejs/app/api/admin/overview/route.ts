import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin-session";
import { getGatewayOverview } from "@/services/mpesa/service";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getGatewayOverview());
}
