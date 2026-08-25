import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin-session";
import { getGatewayConfig } from "@/lib/mpesa/config";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    getGatewayConfig().applications.map(({ secret, secretHash, ...application }) => ({
      ...application,
      hasSecret: Boolean(secret || secretHash),
    })),
  );
}
