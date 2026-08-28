import { createHash } from "node:crypto";

import type { CallbackRecord, CallbackName } from "@/types/gateway";
import { createSupabaseAdminClient, hasSupabaseAdminAccess } from "@/lib/supabase/admin";

type ProviderEventRow = {
  event_type: string;
  id: string;
  payload: Record<string, unknown>;
  processing_status: string;
  received_at: string;
  source_ip: string | null;
};

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

export async function persistCallbackRecord(record: CallbackRecord) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return;
  }

  const innerPayload = readCallbackPayload(record.payload);
  const { error } = await supabase.from("provider_events").insert({
    provider: "mpesa",
    event_type: record.callbackName,
    provider_request_id: inferProviderRequestId(innerPayload),
    payload: record.payload,
    payload_hash: buildPayloadHash(record.payload),
    processing_status: mapProcessingStatus(record.processingStatus),
    received_at: record.receivedAt,
    source_ip: record.sourceIp ?? null,
  });

  if (error) {
    throw new Error(`Unable to persist callback event: ${error.message}`);
  }
}

export async function listStoredCallbacks(limit = 50) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("provider_events")
    .select("id, event_type, payload, processing_status, received_at, source_ip")
    .eq("provider", "mpesa")
    .order("received_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Unable to load stored callbacks: ${error.message}`);
  }

  return (data as ProviderEventRow[]).map(mapCallbackRow);
}

export { hasSupabaseAdminAccess };
