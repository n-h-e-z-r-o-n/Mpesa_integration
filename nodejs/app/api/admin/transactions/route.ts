import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin-session";
import { listDatabaseTransactions } from "@/lib/repositories/transaction-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json((await listDatabaseTransactions()) ?? []);
  } catch (error) {
    console.error("Unable to load database transactions for admin API", error);
    return NextResponse.json({ success: false, error: "Unable to load transactions" }, { status: 500 });
  }
}
