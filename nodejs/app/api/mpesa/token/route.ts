import type { NextRequest } from "next/server";

import { handleApplicationOperation } from "@/lib/gateway/http";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return handleApplicationOperation(request, "oauthToken");
}
