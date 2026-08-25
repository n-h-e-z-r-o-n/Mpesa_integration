import { randomUUID } from "node:crypto";

import { ZodError } from "zod";

import { NextResponse, type NextRequest } from "next/server";

import { authenticateApplication } from "@/lib/auth/application-auth";
import { getAdminSession } from "@/lib/auth/admin-session";
import { getOperationDefinition } from "@/lib/gateway/catalog";
import { beginIdempotentOperation, completeIdempotentOperation, createIdempotencyFingerprint } from "@/lib/gateway/idempotency";
import { logEvent, sanitizeForLogs } from "@/lib/logger";
import { getGatewayConfig } from "@/lib/mpesa/config";
import { GatewayAuthenticationError, GatewayValidationError } from "@/lib/mpesa/errors";
import { createRequestId } from "@/lib/mpesa/utils";
import { addRequestLog } from "@/lib/repositories/runtime-store";
import { executeMpesaOperation, normalizeError, processMpesaCallback } from "@/services/mpesa/service";
import type { CallbackName, MpesaOperation } from "@/types/gateway";

function responseWithRequestId(payload: unknown, status: number, requestId: string) {
  const response = NextResponse.json(payload, { status });
  response.headers.set("x-request-id", requestId);
  response.headers.set("cache-control", "no-store");
  return response;
}

async function parseRequestBody(request: NextRequest) {
  if (request.method === "GET") {
    return {};
  }

  try {
    return (await request.json()) as unknown;
  } catch {
    return {};
  }
}

function getClientIp(request: NextRequest) {
  const header = request.headers.get("x-forwarded-for");
  return header?.split(",")[0]?.trim();
}

function ensureCallbackSourceAllowed(request: NextRequest) {
  const config = getGatewayConfig();
  if (!config.callbackAllowedIps.length) {
    return;
  }

  const sourceIp = getClientIp(request);
  if (!sourceIp || !config.callbackAllowedIps.includes(sourceIp)) {
    throw new GatewayAuthenticationError("Callback source IP is not allowed", { sourceIp });
  }
}

function toValidationError(error: ZodError) {
  return new GatewayValidationError("Request validation failed", {
    fields: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

export async function handleApplicationOperation(request: NextRequest, operation: MpesaOperation) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  try {
    const application = authenticateApplication(request, operation);
    const input = await parseRequestBody(request);
    const context = {
      requestId,
      applicationId: application.id,
      route: request.nextUrl.pathname,
      method: request.method,
      startedAt,
      idempotencyKey: request.headers.get("Idempotency-Key") ?? undefined,
    };

    const definition = getOperationDefinition(operation);
    if (definition.moneyMoving && context.idempotencyKey) {
      const fingerprint = createIdempotencyFingerprint(operation, application.id, input);
      const idempotencyResult = beginIdempotentOperation(context.idempotencyKey, operation, fingerprint);
      if (idempotencyResult.replayed && idempotencyResult.response) {
        return responseWithRequestId(
          {
            ...idempotencyResult.response,
            meta: {
              ...idempotencyResult.response.meta,
              replayed: true,
            },
          },
          idempotencyResult.response.httpStatus,
          requestId,
        );
      }

      const result = await executeMpesaOperation(operation, input, context);
      completeIdempotentOperation(context.idempotencyKey, operation, fingerprint, result);
      return responseWithRequestId(result, result.httpStatus, requestId);
    }

    const result = await executeMpesaOperation(operation, input, context);
    return responseWithRequestId(result, result.httpStatus, requestId);
  } catch (error) {
    const context = {
      requestId,
      applicationId: "unknown",
      route: request.nextUrl.pathname,
      method: request.method,
      startedAt,
    };
    const normalized = normalizeError(error instanceof ZodError ? toValidationError(error) : error, operation, context);
    addRequestLog({
      id: randomUUID(),
      requestId,
      applicationId: "unknown",
      provider: "mpesa",
      operation,
      route: request.nextUrl.pathname,
      method: request.method,
      status: normalized.httpStatus,
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      error: sanitizeForLogs(normalized.error ?? {}),
    });
    logEvent("warn", "Gateway application operation failed", {
      requestId,
      operation,
      route: request.nextUrl.pathname,
      error: normalized.error,
    });
    return responseWithRequestId(normalized, normalized.httpStatus, requestId);
  }
}

export async function handleAdminOperation(request: NextRequest, operation: MpesaOperation) {
  const session = await getAdminSession();
  if (!session) {
    const requestId = createRequestId();
    return responseWithRequestId(
      {
        success: false,
        provider: "mpesa",
        operation,
        requestId,
        timestamp: new Date().toISOString(),
        status: "failed",
        httpStatus: 401,
        error: {
          code: "authentication_error",
          message: "Administrator session is required",
        },
      },
      401,
      requestId,
    );
  }

  const requestId = createRequestId();
  const startedAt = Date.now();

  try {
    const input = await parseRequestBody(request);
    const context = {
      requestId,
      applicationId: "admin-console",
      route: request.nextUrl.pathname,
      method: request.method,
      startedAt,
      idempotencyKey: request.headers.get("Idempotency-Key") ?? undefined,
      adminUser: session.email,
    };

    const definition = getOperationDefinition(operation);
    if (definition.moneyMoving && context.idempotencyKey) {
      const fingerprint = createIdempotencyFingerprint(operation, context.applicationId, input);
      const idempotencyResult = beginIdempotentOperation(context.idempotencyKey, operation, fingerprint);
      if (idempotencyResult.replayed && idempotencyResult.response) {
        return responseWithRequestId(
          {
            ...idempotencyResult.response,
            meta: {
              ...idempotencyResult.response.meta,
              replayed: true,
            },
          },
          idempotencyResult.response.httpStatus,
          requestId,
        );
      }

      const result = await executeMpesaOperation(operation, input, context);
      completeIdempotentOperation(context.idempotencyKey, operation, fingerprint, result);
      return responseWithRequestId(result, result.httpStatus, requestId);
    }

    const result = await executeMpesaOperation(operation, input, context);
    return responseWithRequestId(result, result.httpStatus, requestId);
  } catch (error) {
    const context = {
      requestId,
      applicationId: "admin-console",
      route: request.nextUrl.pathname,
      method: request.method,
      startedAt,
      adminUser: session.email,
    };
    const normalized = normalizeError(error instanceof ZodError ? toValidationError(error) : error, operation, context);
    return responseWithRequestId(normalized, normalized.httpStatus, requestId);
  }
}

export async function handleMpesaCallback(request: NextRequest, callbackName: CallbackName) {
  const requestId = createRequestId();

  try {
    ensureCallbackSourceAllowed(request);
    const text = await request.text();
    let payload: Record<string, unknown>;
    try {
      payload = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      payload = { rawBody: text };
    }

    const response = processMpesaCallback(callbackName, payload, getClientIp(request));
    return responseWithRequestId(response, 200, requestId);
  } catch (error) {
    const normalized = normalizeError(
      error,
      "ratiba",
      {
        requestId,
        applicationId: "safaricom",
        route: request.nextUrl.pathname,
        method: request.method,
        startedAt: Date.now(),
      },
    );
    return responseWithRequestId(normalized, normalized.httpStatus, requestId);
  }
}
