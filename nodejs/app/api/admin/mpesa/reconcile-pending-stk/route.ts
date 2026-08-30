import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin-session";
import { reconcilePendingStkTransactions } from "@/services/mpesa/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function parseBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readPositiveInteger(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await parseBody(request);
    const result = await reconcilePendingStkTransactions({
      limit: readPositiveInteger(body.limit, 20),
      minAgeMinutes: readPositiveInteger(body.minAgeMinutes, 5),
      maxAgeMinutes: readPositiveInteger(body.maxAgeMinutes, 24 * 60),
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Unable to reconcile pending STK transactions", error);
    return NextResponse.json(
      { success: false, error: "Unable to reconcile pending STK transactions" },
      { status: 500 },
    );
  }
}
