import { GatewayConflictError } from "@/lib/mpesa/errors";
import { toSha256 } from "@/lib/mpesa/utils";
import { getIdempotencyRecord, setIdempotencyRecord } from "@/lib/repositories/runtime-store";
import type { NormalizedGatewayResponse, MpesaOperation } from "@/types/gateway";

export function createIdempotencyFingerprint(operation: MpesaOperation, applicationId: string, payload: unknown) {
  return toSha256(JSON.stringify({ operation, applicationId, payload }));
}

export function beginIdempotentOperation(key: string, operation: MpesaOperation, fingerprint: string) {
  const existing = getIdempotencyRecord(key);
  if (!existing) {
    setIdempotencyRecord({
      key,
      operation,
      fingerprint,
      createdAt: new Date().toISOString(),
      state: "processing",
    });
    return { replayed: false } as const;
  }

  if (existing.operation !== operation || existing.fingerprint !== fingerprint) {
    throw new GatewayConflictError("Idempotency key reuse does not match the original request", {
      key,
      operation,
    });
  }

  if (existing.state === "processing") {
    throw new GatewayConflictError("An operation with this idempotency key is already in progress", {
      key,
      operation,
    });
  }

  return {
    replayed: true,
    response: existing.response,
  } as const;
}

export function completeIdempotentOperation(
  key: string,
  operation: MpesaOperation,
  fingerprint: string,
  response: NormalizedGatewayResponse<Record<string, unknown>>,
) {
  setIdempotencyRecord({
    key,
    operation,
    fingerprint,
    createdAt: new Date().toISOString(),
    state: "completed",
    response,
  });
}
