import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MpesaOperation, TransactionRecord, TransactionStatus } from "@/types/gateway";

type TransactionRow = {
  id: string;
  application_id: string | null;
  provider: string;
  provider_operation: string;
  status: string;
  amount: number | string | null;
  customer_msisdn: string | null;
  account_reference: string | null;
  external_reference: string | null;
  provider_request_id: string | null;
  provider_transaction_id: string | null;
  idempotency_key: string | null;
  created_at: string;
  processing_started_at: string | null;
  completed_at: string | null;
  provider_metadata: Record<string, unknown> | null;
};

let transactionsSupportsApplicationId: boolean | null = null;

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readRecord(value: unknown) {
  return isRecordObject(value) ? value : {};
}

function readRecordArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => isRecordObject(item))
    : [];
}

function readMetadataString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = readString(metadata[key]);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function isMissingApplicationIdColumn(error: { message?: string } | null) {
  const message = error?.message ?? "";
  return (
    message.includes("'application_id' column") ||
    message.includes("transactions.application_id") ||
    message.includes("column application_id does not exist")
  );
}

function mapTransactionStatus(status: string): TransactionStatus {
  switch (status) {
    case "processing":
      return "accepted";
    case "reversed":
      return "cancelled";
    case "pending":
    case "accepted":
    case "succeeded":
    case "failed":
    case "cancelled":
    case "timeout":
      return status;
    default:
      return "unknown";
  }
}

function mapTransactionRow(row: TransactionRow): TransactionRecord {
  const metadata = readRecord(row.provider_metadata);

  return {
    id: readMetadataString(metadata, ["recordId"]) ?? row.id,
    requestId: readMetadataString(metadata, ["requestId"]) ?? row.provider_request_id ?? row.id,
    provider: row.provider as TransactionRecord["provider"],
    operation: row.provider_operation as MpesaOperation,
    applicationId: row.application_id ?? readMetadataString(metadata, ["applicationId"]) ?? "unknown",
    status: mapTransactionStatus(row.status),
    amount: readNumber(row.amount),
    partyA: readMetadataString(metadata, ["partyA"]),
    partyB: row.customer_msisdn ?? readMetadataString(metadata, ["partyB"]),
    accountReference:
      row.account_reference ??
      row.external_reference ??
      readMetadataString(metadata, ["accountReference", "externalReference"]),
    transactionId: row.provider_transaction_id ?? undefined,
    providerRequestId: row.provider_request_id ?? undefined,
    providerConversationId: readMetadataString(metadata, [
      "providerConversationId",
      "conversationId",
    ]),
    providerOriginatorConversationId: readMetadataString(metadata, [
      "providerOriginatorConversationId",
      "originatorConversationId",
    ]),
    idempotencyKey: row.idempotency_key ?? undefined,
    createdAt: row.created_at,
    updatedAt:
      readMetadataString(metadata, ["updatedAt"]) ??
      row.completed_at ??
      row.processing_started_at ??
      row.created_at,
    requestPayload: readRecord(metadata.requestPayload),
    responsePayload: isRecordObject(metadata.responsePayload) ? metadata.responsePayload : undefined,
    callbackPayloads: readRecordArray(metadata.callbackPayloads),
  };
}

export async function listDatabaseTransactions(limit = 100): Promise<TransactionRecord[] | null> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const runQuery = async (includeApplicationId: boolean) =>
    supabase
      .from("transactions")
      .select(
        [
          "id",
          ...(includeApplicationId ? ["application_id"] : []),
          "provider",
          "provider_operation",
          "status",
          "amount",
          "customer_msisdn",
          "account_reference",
          "external_reference",
          "provider_request_id",
          "provider_transaction_id",
          "idempotency_key",
          "created_at",
          "processing_started_at",
          "completed_at",
          "provider_metadata",
        ].join(", "),
      )
      .eq("provider", "mpesa")
      .order("created_at", { ascending: false })
      .limit(limit)
      .returns<TransactionRow[]>();

  const includeApplicationId = transactionsSupportsApplicationId !== false;
  let { data, error } = await runQuery(includeApplicationId);

  if (isMissingApplicationIdColumn(error)) {
    transactionsSupportsApplicationId = false;
    ({ data, error } = await runQuery(false));
  } else if (!error && transactionsSupportsApplicationId === null) {
    transactionsSupportsApplicationId = includeApplicationId;
  }

  if (error) {
    throw new Error(`Unable to load database transactions: ${error.message}`);
  }

  return (data ?? []).map(mapTransactionRow);
}
