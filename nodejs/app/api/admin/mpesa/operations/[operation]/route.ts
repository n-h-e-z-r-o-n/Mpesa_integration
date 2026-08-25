import { NextResponse, type NextRequest } from "next/server";

import { handleAdminOperation } from "@/lib/gateway/http";
import { operationCatalog } from "@/lib/gateway/catalog";
import type { MpesaOperation } from "@/types/gateway";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ operation: string }> },
) {
  const params = await context.params;
  const operation = operationCatalog.find((item) => item.id === params.operation)?.id;
  if (!operation) {
    return NextResponse.json({ success: false, error: "Unknown operation" }, { status: 404 });
  }

  return handleAdminOperation(request, operation as MpesaOperation);
}
