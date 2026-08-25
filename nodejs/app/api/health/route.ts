import { NextResponse } from "next/server";

import { getGatewayOverview } from "@/services/mpesa/service";

export const runtime = "nodejs";

export async function GET() {
  const overview = await getGatewayOverview();
  return NextResponse.json({
    status: overview.providerHealth === "healthy" ? "ok" : "degraded",
    provider: "mpesa",
    overview,
  });
}
