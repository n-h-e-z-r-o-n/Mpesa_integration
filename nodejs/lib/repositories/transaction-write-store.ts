import { getGatewayConfig } from "@/lib/mpesa/config";
import type { GatewayRequestContext } from "@/lib/mpesa/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MpesaOperation, TransactionRecord, TransactionStatus } from "@/types/gateway";

type DatabaseTransactionType = "collection" | "disbursement" | "refund" | "reversal";
type DatabaseTransactionStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "reversed";

type MerchantRow = {
  id: string;
};

type DatabaseTransactionRow = {
  id: string;
  merchant_id: string;
};

type PersistedTransactionReference = {
  id: string;
  merchantId: string;
};

let transactionsSupportsApplicationId: boolean | null = null;

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isMissingApplicationIdColumn(error: { message?: string } | null) {
  const message = error?.message ?? "";
  return (
    message.includes("'application_id' column") ||
    message.includes("transactions.application_id") ||
    message.includes("column application_id does not exist")
  );
}

function normalizeEnvironment(environment: "sandbox" | "production") {
  return environment === "production" ? "live" : "sandbox";
}

function isTerminalStatus(status: DatabaseTransactionStatus) {
  return status === "succeeded" || status === "failed" || status === "cancelled" || status === "reversed";
}

function mapDatabaseStatus(status: TransactionStatus, operation: MpesaOperation): DatabaseTransactionStatus {
  if (operation === "reversal" && status === "succeeded") {
    return "reversed";
  }

  switch (status) {
    case "accepted":
      return "processing";
    case "pending":
      return "pending";
    case "succeeded":
      return "succeeded";
    case "failed":
    case "timeout":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "processing";
  }
}

function resolveTransactionType(operation: MpesaOperation): DatabaseTransactionType | null {
  switch (operation) {
    case "stkPush":
    case "c2bRegister":
    case "c2bSimulate":
    case "pullTransactions":
      return "collection";
    case "b2c":
    case "b2b":
    case "businessToPochi":
      return "disbursement";
    case "reversal":
      return "reversal";
    default:
      return null;
  }
}

function inferCurrency(record: TransactionRecord) {
  return readString(record.requestPayload.currency) ?? "KES";
}

function inferDescription(record: TransactionRecord) {
  return (
    readString(record.requestPayload.TransactionDesc) ??
    readString(record.requestPayload.Remarks) ??
    readString(readProviderResultPayload(record).ResponseDescription) ??
    readString(readProviderResultPayload(record).ResultDesc) ??
    readString(record.responsePayload?.ResponseDescription)
  );
}

function readCallbackPayload(payload: Record<string, unknown>) {
  if (isRecordObject(payload.Body)) {
    const body = payload.Body;
    if (isRecordObject(body.stkCallback)) {
      return body.stkCallback;
    }

    return body;
  }

  if (isRecordObject(payload.Result)) {
    return payload.Result;
  }

  return payload;
}

function readProviderResultPayload(record: TransactionRecord) {
  const latestCallback = record.callbackPayloads[0];
  if (latestCallback && isRecordObject(latestCallback)) {
    return readCallbackPayload(latestCallback);
  }

  return record.responsePayload ?? {};
}

function readCallbackMetadataItems(payload: Record<string, unknown>) {
  const callbackMetadata = payload.CallbackMetadata;
  if (!callbackMetadata || typeof callbackMetadata !== "object") {
    return [];
  }

  const items = (callbackMetadata as Record<string, unknown>).Item;
  if (Array.isArray(items)) {
    return items.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
  }

  if (items && typeof items === "object") {
    return [items as Record<string, unknown>];
  }

  return [];
}

function readCallbackResultParameterItems(payload: Record<string, unknown>) {
  const resultParameters = payload.ResultParameters;
  if (!resultParameters || typeof resultParameters !== "object") {
    return [];
  }

  const items = (resultParameters as Record<string, unknown>).ResultParameter;
  if (Array.isArray(items)) {
    return items.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
  }

  if (items && typeof items === "object") {
    return [items as Record<string, unknown>];
  }

  return [];
}

function inferCallbackTransactionId(payload: Record<string, unknown>) {
  const nestedMatch = [...readCallbackMetadataItems(payload), ...readCallbackResultParameterItems(payload)].find(
    (item) =>
      typeof item.Key === "string" &&
      ["MpesaReceiptNumber", "TransactionID", "TransactionReceipt", "TransID"].includes(item.Key) &&
      typeof item.Value === "string",
  );

  return (
    readString(payload.TransactionID) ??
    readString(payload.TransID) ??
    readString(payload.MpesaReceiptNumber) ??
    (typeof nestedMatch?.Value === "string" ? nestedMatch.Value : undefined)
  );
}

function inferCustomerMsisdn(record: TransactionRecord, transactionType: DatabaseTransactionType) {
  if (transactionType === "collection") {
    return record.partyA ?? record.partyB;
  }

  if (transactionType === "disbursement") {
    return record.partyB ?? record.partyA;
  }

  return record.partyA ?? record.partyB;
}

function buildProviderMetadata(record: TransactionRecord) {
  return {
    recordId: record.id,
    requestId: record.requestId,
    applicationId: record.applicationId,
    updatedAt: record.updatedAt,
    partyA: record.partyA,
    partyB: record.partyB,
    accountReference: record.accountReference,
    providerConversationId: record.providerConversationId,
    providerOriginatorConversationId: record.providerOriginatorConversationId,
    requestPayload: record.requestPayload,
    responsePayload: record.responsePayload,
    callbackPayloads: record.callbackPayloads,
  } satisfies Record<string, unknown>;
}

async function resolveFallbackMerchantId() {
  const config = getGatewayConfig();
  if (config.defaultMerchantId) {
    return config.defaultMerchantId;
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("merchant_accounts")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(2)
    .returns<MerchantRow[]>();

  if (error) {
    throw new Error(`Unable to resolve fallback merchant: ${error.message}`);
  }

  if (!data || data.length !== 1) {
    return null;
  }

  return data[0]?.id ?? null;
}

async function resolveMerchantIdForAdminUser(adminUserId: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("merchant_accounts")
    .select("id")
    .eq("owner_user_id", adminUserId)
    .order("created_at", { ascending: true })
    .limit(2)
    .returns<MerchantRow[]>();

  if (error) {
    throw new Error(`Unable to resolve admin merchant: ${error.message}`);
  }

  if (!data || data.length !== 1) {
    return null;
  }

  return data[0]?.id ?? null;
}

export async function resolveMerchantIdForContext(context: GatewayRequestContext) {
  if (context.merchantId) {
    return context.merchantId;
  }

  if (context.adminUserId) {
    return resolveMerchantIdForAdminUser(context.adminUserId);
  }

  return resolveFallbackMerchantId();
}

async function findTransactionByColumn(
  column: string,
  value: string,
  merchantId?: string,
): Promise<PersistedTransactionReference | null> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  let query = supabase
    .from("transactions")
    .select("id, merchant_id")
    .eq("provider", "mpesa")
    .eq(column, value)
    .order("created_at", { ascending: false })
    .limit(1);

  if (merchantId) {
    query = query.eq("merchant_id", merchantId);
  }

  const { data, error } = await query.returns<DatabaseTransactionRow[]>();

  if (error) {
    throw new Error(`Unable to query database transaction by ${column}: ${error.message}`);
  }

  const row = data?.[0];
  return row ? { id: row.id, merchantId: row.merchant_id } : null;
}

async function findExistingDatabaseTransaction(
  record: TransactionRecord,
  merchantId?: string,
): Promise<PersistedTransactionReference | null> {
  const candidates = [
    { column: "provider_metadata->>recordId", value: record.id },
    { column: "provider_request_id", value: record.providerRequestId },
    { column: "provider_transaction_id", value: record.transactionId },
    { column: "provider_metadata->>providerConversationId", value: record.providerConversationId },
    {
      column: "provider_metadata->>providerOriginatorConversationId",
      value: record.providerOriginatorConversationId,
    },
    { column: "idempotency_key", value: record.idempotencyKey },
  ];

  for (const candidate of candidates) {
    if (!candidate.value) {
      continue;
    }

    const match = await findTransactionByColumn(candidate.column, candidate.value, merchantId);
    if (match) {
      return match;
    }
  }

  return null;
}

function buildDatabasePayload(
  record: TransactionRecord,
  merchantId: string,
  transactionType: DatabaseTransactionType,
  includeApplicationId: boolean,
) {
  const status = mapDatabaseStatus(record.status, record.operation);
  const amount = record.amount;
  const providerResultPayload = readProviderResultPayload(record);

  if (amount === undefined || amount === null || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return {
    merchant_id: merchantId,
    ...(includeApplicationId ? { application_id: record.applicationId } : {}),
    environment: normalizeEnvironment(getGatewayConfig().mpesaEnvironment),
    provider: "mpesa",
    provider_operation: record.operation,
    transaction_type: transactionType,
    status,
    amount,
    fee_amount: 0,
    currency: inferCurrency(record),
    external_reference: record.accountReference ?? null,
    idempotency_key: record.idempotencyKey ?? null,
    customer_reference: record.accountReference ?? null,
    customer_msisdn: inferCustomerMsisdn(record, transactionType) ?? null,
    account_reference: record.accountReference ?? null,
    description: inferDescription(record) ?? null,
    provider_request_id: record.providerRequestId ?? null,
    provider_transaction_id: record.transactionId ?? null,
    provider_result_code:
      readString(providerResultPayload.ResponseCode) ??
      readString(providerResultPayload.ResultCode) ??
      null,
    provider_result_description:
      readString(providerResultPayload.ResponseDescription) ??
      readString(providerResultPayload.ResultDesc) ??
      readString(providerResultPayload.errorMessage) ??
      null,
    provider_metadata: buildProviderMetadata(record),
    processing_started_at:
      status === "processing" || status === "pending" || isTerminalStatus(status)
        ? record.createdAt
        : null,
    completed_at: isTerminalStatus(status) ? record.updatedAt : null,
  };
}

export async function persistDatabaseTransactionRecord(
  record: TransactionRecord,
  context: GatewayRequestContext,
  existing?: PersistedTransactionReference | null,
) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const transactionType = resolveTransactionType(record.operation);
  if (!transactionType) {
    return null;
  }

  const merchantId = existing?.merchantId ?? (await resolveMerchantIdForContext(context));
  if (!merchantId) {
    return null;
  }

  const match = existing ?? (await findExistingDatabaseTransaction(record, merchantId));
  const persistWithPayload = async (includeApplicationId: boolean) => {
    const payload = buildDatabasePayload(record, merchantId, transactionType, includeApplicationId);
    if (!payload) {
      return null;
    }

    if (match) {
      const { data, error } = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", match.id)
        .select("id, merchant_id")
        .single<DatabaseTransactionRow>();

      if (error) {
        if (includeApplicationId && isMissingApplicationIdColumn(error)) {
          transactionsSupportsApplicationId = false;
          return persistWithPayload(false);
        }

        throw new Error(`Unable to update database transaction: ${error.message}`);
      }

      if (transactionsSupportsApplicationId === null) {
        transactionsSupportsApplicationId = includeApplicationId;
      }

      return {
        id: data.id,
        merchantId: data.merchant_id,
      } satisfies PersistedTransactionReference;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert(payload)
      .select("id, merchant_id")
      .single<DatabaseTransactionRow>();

    if (error) {
      if (includeApplicationId && isMissingApplicationIdColumn(error)) {
        transactionsSupportsApplicationId = false;
        return persistWithPayload(false);
      }

      throw new Error(`Unable to insert database transaction: ${error.message}`);
    }

    if (transactionsSupportsApplicationId === null) {
      transactionsSupportsApplicationId = includeApplicationId;
    }

    return {
      id: data.id,
      merchantId: data.merchant_id,
    } satisfies PersistedTransactionReference;
  };

  return persistWithPayload(transactionsSupportsApplicationId !== false);
}

export async function findDatabaseTransactionForCallbackPayload(
  payload: Record<string, unknown>,
) {
  const checkoutRequestId = readString(payload.CheckoutRequestID);
  const merchantRequestId = readString(payload.MerchantRequestID);
  const transactionId = inferCallbackTransactionId(payload);
  const conversationId = readString(payload.ConversationID);
  const originatorConversationId = readString(payload.OriginatorConversationID);

  const candidates = [
    checkoutRequestId ? { column: "provider_metadata->>recordId", value: checkoutRequestId } : null,
    checkoutRequestId ? { column: "provider_request_id", value: checkoutRequestId } : null,
    merchantRequestId ? { column: "provider_request_id", value: merchantRequestId } : null,
    transactionId ? { column: "provider_transaction_id", value: transactionId } : null,
    conversationId ? { column: "provider_metadata->>providerConversationId", value: conversationId } : null,
    originatorConversationId
      ? {
          column: "provider_metadata->>providerOriginatorConversationId",
          value: originatorConversationId,
        }
      : null,
    originatorConversationId ? { column: "provider_request_id", value: originatorConversationId } : null,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const match = await findTransactionByColumn(candidate.column, candidate.value);
    if (match) {
      return match;
    }
  }

  return null;
}
