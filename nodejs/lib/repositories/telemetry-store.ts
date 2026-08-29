import type { AuditLogRecord, RequestLogRecord, TransactionRecord } from "@/types/gateway";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AuditLogRow = {
  created_at: string;
  metadata: Record<string, unknown> | null;
};

const transactionSnapshotAction = "gateway_transaction_snapshot";
const requestLogAction = "gateway_request_log";
const auditLogAction = "gateway_audit_log";

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTransactionRecord(value: unknown): value is TransactionRecord {
  if (!isRecordObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.requestId === "string" &&
    typeof value.provider === "string" &&
    typeof value.operation === "string" &&
    typeof value.applicationId === "string" &&
    typeof value.status === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    isRecordObject(value.requestPayload) &&
    Array.isArray(value.callbackPayloads)
  );
}

function isRequestLogRecord(value: unknown): value is RequestLogRecord {
  if (!isRecordObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.requestId === "string" &&
    typeof value.applicationId === "string" &&
    typeof value.provider === "string" &&
    typeof value.operation === "string" &&
    typeof value.route === "string" &&
    typeof value.method === "string" &&
    typeof value.status === "number" &&
    typeof value.latencyMs === "number" &&
    typeof value.timestamp === "string"
  );
}

function isAuditLogRecord(value: unknown): value is AuditLogRecord {
  if (!isRecordObject(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    (value.level === "info" || value.level === "warn" || value.level === "error") &&
    typeof value.message === "string" &&
    typeof value.timestamp === "string" &&
    (value.data === undefined || isRecordObject(value.data))
  );
}

async function insertAuditLog(action: string, entityType: string, metadata: Record<string, unknown>) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("audit_logs").insert({
    action,
    entity_type: entityType,
    metadata,
  });

  if (error) {
    throw new Error(`Unable to persist ${action}: ${error.message}`);
  }
}

async function listAuditLogs(action: string, limit: number, since?: string) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  let query = supabase
    .from("audit_logs")
    .select("created_at, metadata")
    .eq("action", action)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (since) {
    query = query.gte("created_at", since);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Unable to load ${action}: ${error.message}`);
  }

  return (data ?? []) as AuditLogRow[];
}

function dedupeTransactions(rows: AuditLogRow[]) {
  const records: TransactionRecord[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    if (!isTransactionRecord(row.metadata) || seen.has(row.metadata.id)) {
      continue;
    }

    seen.add(row.metadata.id);
    records.push(row.metadata);
  }

  return records;
}

export async function persistTransactionSnapshot(record: TransactionRecord) {
  await insertAuditLog(
    transactionSnapshotAction,
    "gateway_transaction",
    record as unknown as Record<string, unknown>,
  );
}

export async function persistRequestLog(record: RequestLogRecord) {
  await insertAuditLog(
    requestLogAction,
    "gateway_request",
    record as unknown as Record<string, unknown>,
  );
}

export async function persistAuditLog(record: AuditLogRecord) {
  await insertAuditLog(
    auditLogAction,
    "gateway_audit_log",
    record as unknown as Record<string, unknown>,
  );
}

export async function listStoredTransactions(limit = 100): Promise<TransactionRecord[] | null> {
  const rows = await listAuditLogs(transactionSnapshotAction, Math.max(limit * 5, 200));
  if (!rows) {
    return null;
  }

  return dedupeTransactions(rows).slice(0, limit) as TransactionRecord[];
}

export async function listStoredTransactionsSince(
  since: string,
  limit = 500,
): Promise<TransactionRecord[] | null> {
  const rows = await listAuditLogs(transactionSnapshotAction, limit, since);
  if (!rows) {
    return null;
  }

  return dedupeTransactions(rows) as TransactionRecord[];
}

export async function listStoredRequestLogs(limit = 100): Promise<RequestLogRecord[] | null> {
  const rows = await listAuditLogs(requestLogAction, limit);
  if (!rows) {
    return null;
  }

  return rows
    .map((row) => row.metadata)
    .filter(isRequestLogRecord)
    .slice(0, limit) as unknown as RequestLogRecord[];
}

export async function listStoredAuditLogs(limit = 100): Promise<AuditLogRecord[] | null> {
  const rows = await listAuditLogs(auditLogAction, limit);
  if (!rows) {
    return null;
  }

  return rows
    .map((row) => row.metadata)
    .filter(isAuditLogRecord)
    .slice(0, limit) as unknown as AuditLogRecord[];
}
