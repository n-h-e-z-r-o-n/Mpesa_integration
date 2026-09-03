import { NextResponse, type NextRequest } from "next/server";

import { authenticateApplication } from "@/lib/auth/application-auth";
import { listDatabaseTransactions } from "@/lib/repositories/transaction-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  let application;
  try {
    application = await authenticateApplication(request, "stkPush");
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unauthorized",
      },
      { status: 401 },
    );
  }

  const lookup = {
    requestId: request.nextUrl.searchParams.get("requestId") ?? undefined,
    checkoutRequestId: request.nextUrl.searchParams.get("checkoutRequestId") ?? undefined,
    idempotencyKey: request.nextUrl.searchParams.get("idempotencyKey") ?? undefined,
    accountReference: request.nextUrl.searchParams.get("accountReference") ?? undefined,
  };

  if (!lookup.requestId && !lookup.checkoutRequestId && !lookup.idempotencyKey && !lookup.accountReference) {
    return NextResponse.json(
      {
        success: false,
        error: "One of requestId, checkoutRequestId, idempotencyKey, or accountReference is required",
      },
      { status: 400 },
    );
  }

  try {
    const transactions = (await listDatabaseTransactions(500)) ?? [];
    const transaction = transactions.find((item) => {
      if (item.applicationId !== application.id) {
        return false;
      }

      return (
        (lookup.requestId && item.requestId === lookup.requestId) ||
        (lookup.checkoutRequestId && item.providerRequestId === lookup.checkoutRequestId) ||
        (lookup.idempotencyKey && item.idempotencyKey === lookup.idempotencyKey) ||
        (lookup.accountReference && item.accountReference === lookup.accountReference)
      );
    });

    if (!transaction) {
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        requestId: transaction.requestId,
        checkoutRequestId: transaction.providerRequestId,
        transactionId: transaction.transactionId,
        status: transaction.status,
        amount: transaction.amount,
        accountReference: transaction.accountReference,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unable to load transaction status",
      },
      { status: 500 },
    );
  }
}
