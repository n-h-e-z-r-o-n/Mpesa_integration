import type { NextRequest } from "next/server";

import { handleAdminOperation } from "@/lib/gateway/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleAdminOperation(request, "oauthToken");
}
