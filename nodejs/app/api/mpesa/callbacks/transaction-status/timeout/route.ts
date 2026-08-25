import type { NextRequest } from "next/server";
import { handleMpesaCallback } from "@/lib/gateway/http";
export const runtime = "nodejs";
export async function POST(request: NextRequest) { return handleMpesaCallback(request, "transactionStatusTimeout"); }
