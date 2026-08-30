import { createHash } from "node:crypto";

import type { CallbackRecord, CallbackName } from "@/types/gateway";
import { createSupabaseAdminClient, hasSupabaseAdminAccess } from "@/lib/supabase/admin";

type ProviderEventRow = {
  event_type: string;
  id: string;
  merchant_account_id?: string | null;
  payload: Record<string, unknown>;
  processing_status: string;
  received_at: string;
  source_ip?: string | null;
};

let providerEventsSupportsSourceIp: boolean | null = null;

function readCallbackPayload(payload: Record<string, unknown>) {
  if (payload.Body && typeof payload.Body === "object") {
    const body = payload.Body as Record<string, unknown>;
    if (body.stkCallback && typeof body.stkCallback === "object") {
      return body.stkCallback as Record<string, unknown>;
    }
    return body;
  }

  if (payload.Result && typeof payload.Result === "object") {
    return payload.Result as Record<string, unknown>;
  }

  return payload;
}

function inferProviderRequestId(payload: Record<string, unknown>) {
  return (
    readString(payload.CheckoutRequestID) ??
    readString(payload.OriginatorConversationID) ??
    readString(payload.ConversationID) ??
    readString(payload.MerchantRequestID) ??
    readString(payload.TransID) ??
    readString(payload.MpesaReceiptNumber) ??
    readString(payload.TransactionID)
  );
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildPayloadHash(payload: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function mapProcessingStatus(status: CallbackRecord["processingStatus"]) {
  return status === "accepted" ? "processed" : "failed";
}

function mapCallbackRow(row: ProviderEventRow): CallbackRecord {
  return {
    id: row.id,
    requestId: row.id,
    callbackName: row.event_type as CallbackName,
    provider: "mpesa",
    receivedAt: row.received_at,
    sourceIp: row.source_ip ?? undefined,
    processingStatus: row.processing_status === "failed" ? "rejected" : "accepted",
    payload: row.payload,
  };
}

function buildInsertPayload(record: CallbackRecord, includeSourceIp: boolean) {
  return {
    provider: "mpesa",
    event_type: record.callbackName,
    provider_request_id: inferProviderRequestId(readCallbackPayload(record.payload)),
    payload: record.payload,
    payload_hash: buildPayloadHash(record.payload),
    processing_status: mapProcessingStatus(record.processingStatus),
    received_at: record.receivedAt,
    ...(includeSourceIp ? { source_ip: record.sourceIp ?? null } : {}),
  };
}

function getSelectColumns(includeSourceIp: boolean) {
  return includeSourceIp
    ? "id, event_type, merchant_account_id, payload, processing_status, received_at, source_ip"
    : "id, event_type, merchant_account_id, payload, processing_status, received_at";
}

function isMissingSourceIpColumn(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("'source_ip' column"));
}

type CallbackQueryOptions = {
  callbackName?: CallbackName;
  callbackNames?: CallbackName[];
  since?: string;
};

async function loadStoredCallbacks(limit: number, options?: CallbackQueryOptions) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const runQuery = async (includeSourceIp: boolean) => {
    let query = supabase
      .from("provider_events")
      .select(getSelectColumns(includeSourceIp))
      .eq("provider", "mpesa");

    if (options?.callbackNames?.length) {
      query =
        options.callbackNames.length === 1
          ? query.eq("event_type", options.callbackNames[0])
          : query.in("event_type", options.callbackNames);
    } else if (options?.callbackName) {
      query = query.eq("event_type", options.callbackName);
    }

    if (options?.since) {
      query = query.gte("received_at", options.since);
    }

    return query.order("received_at", { ascending: false }).limit(limit);
  };

  const includeSourceIp = providerEventsSupportsSourceIp !== false;
  let { data, error } = await runQuery(includeSourceIp);

  if (isMissingSourceIpColumn(error)) {
    providerEventsSupportsSourceIp = false;
    ({ data, error } = await runQuery(false));
  } else if (!error && providerEventsSupportsSourceIp === null) {
    providerEventsSupportsSourceIp = includeSourceIp;
  }

  if (error) {
    throw new Error(`Unable to load stored callbacks: ${error.message}`);
  }

  return ((data ?? []) as unknown as ProviderEventRow[]).map(mapCallbackRow);
}

export async function persistCallbackRecord(record: CallbackRecord) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const includeSourceIp = providerEventsSupportsSourceIp !== false;
  let { data, error } = await supabase
    .from("provider_events")
    .insert(buildInsertPayload(record, includeSourceIp))
    .select("id")
    .single<{ id: string }>();

  if (isMissingSourceIpColumn(error)) {
    providerEventsSupportsSourceIp = false;
    ({ data, error } = await supabase
      .from("provider_events")
      .insert(buildInsertPayload(record, false))
      .select("id")
      .single<{ id: string }>());
  } else if (!error && providerEventsSupportsSourceIp === null) {
    providerEventsSupportsSourceIp = includeSourceIp;
  }

  if (error) {
    throw new Error(`Unable to persist callback event: ${error.message}`);
  }

  return data?.id ?? null;
}

export async function linkStoredCallbackToTransaction(
  providerEventId: string,
  transactionId: string,
  merchantId: string,
) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("provider_events")
    .update({
      transaction_id: transactionId,
      merchant_account_id: merchantId,
    })
    .eq("id", providerEventId);

  if (error) {
    throw new Error(`Unable to link callback to transaction: ${error.message}`);
  }
}

export async function listStoredCallbacks(limit = 50) {
  return loadStoredCallbacks(limit);
}

export async function getLatestStoredCallback(callbackName: CallbackName) {
  const callbacks = await loadStoredCallbacks(1, { callbackName });
  return callbacks?.[0] ?? null;
}

export async function listStoredCallbacksSince(
  callbackNames: CallbackName[],
  since: string,
  limit = 500,
) {
  return loadStoredCallbacks(limit, { callbackNames, since });
}

export { hasSupabaseAdminAccess };
