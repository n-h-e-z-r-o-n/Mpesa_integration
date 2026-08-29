import type { NextRequest } from "next/server";

import { handleApplicationOperation } from "@/lib/gateway/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  return handleApplicationOperation(request, "dynamicQrCode");
}
