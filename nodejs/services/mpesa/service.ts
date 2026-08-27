import { randomUUID } from "node:crypto";

import { getAccessToken, getCachedTokenState } from "@/lib/mpesa/auth";
import { postToMpesa } from "@/lib/mpesa/client";
import { getGatewayConfig } from "@/lib/mpesa/config";
import { getSecurityCredential } from "@/lib/mpesa/credential";
import {
  extractProviderCode,
  extractProviderMessage,
  GatewayError,
  GatewayValidationError,
  MpesaError,
} from "@/lib/mpesa/errors";
import {
  buildStkPassword,
  ensureC2BCallbackUrlAllowed,
  nairobiTimestamp,
  normalizePhone,
  resolveMpesaPath,
  sanitizeAlphaNumeric,
} from "@/lib/mpesa/utils";
import { logEvent, sanitizeForLogs } from "@/lib/logger";
import {
  addCallback,
  addRequestLog,
  getCallbacks,
  getRequestLogs,
  getTransactions,
  upsertTransaction,
} from "@/lib/repositories/runtime-store";
import { schemaByOperation } from "@/lib/validation/mpesa";
import type { GatewayRequestContext } from "@/lib/mpesa/types";
import type {
  CallbackName,
  GatewayOverview,
  MpesaOperation,
  NormalizedGatewayResponse,
  RequestLogRecord,
  TransactionRecord,
  TransactionStatus,
} from "@/types/gateway";

function requireInitiatorConfig() {
  const config = getGatewayConfig();
  if (!config.initiatorName) {
    throw new GatewayValidationError("MPESA_INITIATOR_NAME is required for this operation");
  }

  return {
    initiatorName: config.initiatorName,
    securityCredential: getSecurityCredential(),
  };
}

function getCallbackUrl(key: keyof ReturnType<typeof getGatewayConfig>["callbackUrls"]) {
  return getGatewayConfig().callbackUrls[key];
}

function getSafeStatus(operation: MpesaOperation, payload: Record<string, unknown>): TransactionStatus {
  if (operation === "stkPush") {
    return extractProviderCode(payload) === "0" ? "pending" : "failed";
  }

  if (
    [
      "b2c",
      "b2b",
      "businessToPochi",
      "transactionStatus",
      "reversal",
      "accountBalance",
    ].includes(
      operation,
    )
  ) {
    return extractProviderCode(payload) === "0" ? "accepted" : "failed";
  }

  return extractProviderCode(payload) === "0" ? "succeeded" : "accepted";
}

function buildUpstreamMetadata(payload: Record<string, unknown>, status: number) {
  return {
    httpStatus: status,
    requestId:
      typeof payload.MerchantRequestID === "string" ? payload.MerchantRequestID : undefined,
    conversationId:
      typeof payload.ConversationID === "string" ? payload.ConversationID : undefined,
    originatorConversationId:
      typeof payload.OriginatorConversationID === "string"
        ? payload.OriginatorConversationID
        : undefined,
    responseCode: extractProviderCode(payload),
    responseDescription: extractProviderMessage(payload),
  };
}

function inferTransactionId(payload: Record<string, unknown>) {
  return typeof payload.TransactionID === "string" ? payload.TransactionID : undefined;
}

function buildTransactionRecord(
  operation: MpesaOperation,
  context: GatewayRequestContext,
  requestPayload: Record<string, unknown>,
  responsePayload: Record<string, unknown>,
  status: TransactionStatus,
) {
  const now = new Date().toISOString();
  const checkoutId =
    typeof responsePayload.CheckoutRequestID === "string" ? responsePayload.CheckoutRequestID : undefined;

  return {
    id: checkoutId ?? context.requestId,
    requestId: context.requestId,
    provider: "mpesa" as const,
    operation,
    applicationId: context.applicationId,
    status,
    amount: typeof requestPayload.Amount === "number" ? requestPayload.Amount : undefined,
    partyA: typeof requestPayload.PartyA === "string" ? requestPayload.PartyA : undefined,
    partyB:
      typeof requestPayload.PartyB === "string"
        ? requestPayload.PartyB
        : typeof requestPayload.PartyB === "number"
          ? String(requestPayload.PartyB)
          : undefined,
    accountReference:
      typeof requestPayload.AccountReference === "string" ? requestPayload.AccountReference : undefined,
    transactionId: inferTransactionId(responsePayload),
    providerRequestId:
      typeof responsePayload.MerchantRequestID === "string"
        ? responsePayload.MerchantRequestID
        : typeof responsePayload.OriginatorConversationID === "string"
          ? responsePayload.OriginatorConversationID
          : undefined,
    providerConversationId:
      typeof responsePayload.ConversationID === "string" ? responsePayload.ConversationID : undefined,
    providerOriginatorConversationId:
      typeof responsePayload.OriginatorConversationID === "string"
        ? responsePayload.OriginatorConversationID
        : undefined,
    idempotencyKey: context.idempotencyKey,
    createdAt: now,
    updatedAt: now,
    requestPayload: sanitizeForLogs(requestPayload),
    responsePayload: sanitizeForLogs(responsePayload),
    callbackPayloads: [],
  } satisfies TransactionRecord;
}

function buildLogRecord(
  context: GatewayRequestContext,
  operation: MpesaOperation,
  response: NormalizedGatewayResponse<Record<string, unknown>>,
  requestPayload: Record<string, unknown>,
): RequestLogRecord {
  return {
    id: randomUUID(),
    requestId: context.requestId,
    applicationId: context.applicationId,
    provider: "mpesa",
    operation,
    route: context.route,
    method: context.method,
    status: response.httpStatus,
    providerStatus: response.status,
    providerRequestId: response.upstream?.requestId,
    providerConversationId: response.upstream?.conversationId,
    latencyMs: response.meta?.latencyMs ?? 0,
    timestamp: response.timestamp,
    requestBody: sanitizeForLogs(requestPayload),
    responseBody: sanitizeForLogs((response.data ?? response.error ?? {}) as Record<string, unknown>),
  };
}

function normalizeSuccess(
  operation: MpesaOperation,
  context: GatewayRequestContext,
  httpStatus: number,
  payload: Record<string, unknown>,
): NormalizedGatewayResponse<Record<string, unknown>> {
  const now = new Date().toISOString();
  return {
    success: true,
    provider: "mpesa",
    operation,
    requestId: context.requestId,
    timestamp: now,
    status: getSafeStatus(operation, payload),
    httpStatus,
    data: sanitizeForLogs(payload),
    upstream: buildUpstreamMetadata(payload, httpStatus),
    meta: {
      applicationId: context.applicationId,
      idempotencyKey: context.idempotencyKey,
      latencyMs: Date.now() - context.startedAt,
    },
  };
}

export function normalizeError(
  error: unknown,
  operation: MpesaOperation,
  context: GatewayRequestContext,
): NormalizedGatewayResponse<Record<string, unknown>> {
  const now = new Date().toISOString();

  if (error instanceof GatewayError) {
    return {
      success: false,
      provider: "mpesa",
      operation,
      requestId: context.requestId,
      timestamp: now,
      status: "failed",
      httpStatus: error.status,
      error: {
        code: error.code,
        message: error.message,
        details: sanitizeForLogs(error.details ?? {}),
      },
      meta: {
        applicationId: context.applicationId,
        idempotencyKey: context.idempotencyKey,
        latencyMs: Date.now() - context.startedAt,
      },
    };
  }

  if (error instanceof MpesaError) {
    const upstream = sanitizeForLogs(error.upstream ?? {});
    return {
      success: false,
      provider: "mpesa",
      operation,
      requestId: context.requestId,
      timestamp: now,
      status: "failed",
      httpStatus: error.status,
      error: {
        code: error.code,
        message: "Safaricom request failed",
        providerCode:
          typeof upstream.providerCode === "string" || typeof upstream.providerCode === "number"
            ? upstream.providerCode
            : undefined,
        providerMessage:
          typeof upstream.providerMessage === "string" ? upstream.providerMessage : error.message,
      },
      upstream: {
        httpStatus: typeof upstream.httpStatus === "number" ? upstream.httpStatus : undefined,
      },
      meta: {
        applicationId: context.applicationId,
        idempotencyKey: context.idempotencyKey,
        latencyMs: Date.now() - context.startedAt,
      },
    };
  }

  return {
    success: false,
    provider: "mpesa",
    operation,
    requestId: context.requestId,
    timestamp: now,
    status: "failed",
    httpStatus: 500,
    error: {
      code: "internal_error",
      message: error instanceof Error ? error.message : "Unknown gateway failure",
    },
    meta: {
      applicationId: context.applicationId,
      idempotencyKey: context.idempotencyKey,
      latencyMs: Date.now() - context.startedAt,
    },
  };
}

function preparePayload(operation: MpesaOperation, input: Record<string, unknown>) {
  const config = getGatewayConfig();

  switch (operation) {
    case "oauthToken":
      return { path: "", requestPayload: {} };
    case "stkPush": {
      const phoneNumber = normalizePhone(String(input.phoneNumber));
      const amount = Number(input.amount);
      const timestamp = nairobiTimestamp();
      const accountReference = sanitizeAlphaNumeric(String(input.accountReference), 12);
      const transactionDesc = sanitizeAlphaNumeric(String(input.transactionDesc), 13);
      if (!accountReference) {
        throw new GatewayValidationError(
          "accountReference must contain at least one alphanumeric character",
        );
      }
      if (!transactionDesc) {
        throw new GatewayValidationError(
          "transactionDesc must contain at least one alphanumeric character",
        );
      }

      const transactionType = String(input.transactionType ?? "CustomerPayBillOnline");
      const partyB =
        transactionType === "CustomerBuyGoodsOnline"
          ? config.tillNumber ?? config.shortcode
          : config.shortcode;

      return {
        path: config.stkPushPath,
        requestPayload: {
          BusinessShortCode: config.shortcode,
          Password: buildStkPassword(timestamp),
          Timestamp: timestamp,
          TransactionType: transactionType,
          Amount: amount,
          PartyA: phoneNumber,
          PartyB: partyB,
          PhoneNumber: phoneNumber,
          CallBackURL: getCallbackUrl("stk"),
          AccountReference: accountReference,
          TransactionDesc: transactionDesc,
        },
      };
    }
    case "stkQuery": {
      const timestamp = nairobiTimestamp();
      return {
        path: config.stkQueryPath,
        requestPayload: {
          BusinessShortCode: config.shortcode,
          Password: buildStkPassword(timestamp),
          Timestamp: timestamp,
          CheckoutRequestID: String(input.checkoutRequestId).trim(),
        },
      };
    }
    case "c2bRegister": {
      ensureC2BCallbackUrlAllowed(getCallbackUrl("c2bConfirmation"));
      ensureC2BCallbackUrlAllowed(getCallbackUrl("c2bValidation"));

      return {
        path: config.c2bRegisterPath,
        requestPayload: {
          ShortCode: config.shortcode,
          ResponseType: String(input.responseType ?? "Completed"),
          ConfirmationURL: getCallbackUrl("c2bConfirmation"),
          ValidationURL: getCallbackUrl("c2bValidation"),
        },
      };
    }
    case "c2bSimulate":
      return {
        path: config.c2bSimulatePath,
        requestPayload: {
          ShortCode: String(input.shortcode || config.shortcode),
          CommandID: String(input.commandId ?? "CustomerPayBillOnline"),
          Amount: Number(input.amount),
          Msisdn: normalizePhone(String(input.phoneNumber)),
          BillRefNumber: String(input.billRefNumber).trim(),
        },
      };
    case "b2c": {
      const credentials = requireInitiatorConfig();
      return {
        path: config.b2cPath,
        requestPayload: {
          OriginatorConversationID: String(input.originatorConversationId || randomUUID()),
          InitiatorName: credentials.initiatorName,
          SecurityCredential: credentials.securityCredential,
          CommandID: String(input.commandId ?? "BusinessPayment"),
          Amount: Number(input.amount),
          PartyA: config.shortcode,
          PartyB: normalizePhone(String(input.phoneNumber)),
          Remarks: String(input.remarks).trim(),
          QueueTimeOutURL: getCallbackUrl("b2cTimeout"),
          ResultURL: getCallbackUrl("b2cResult"),
          Occasion: String(input.occasion ?? "").trim(),
        },
      };
    }
    case "b2b": {
      const credentials = requireInitiatorConfig();
      return {
        path: config.b2bPath,
        requestPayload: {
          Initiator: credentials.initiatorName,
          SecurityCredential: credentials.securityCredential,
          CommandID: String(input.commandId ?? "BusinessPayBill"),
          SenderIdentifierType: String(input.senderIdentifierType ?? "4"),
          RecieverIdentifierType: String(input.receiverIdentifierType ?? "4"),
          Amount: Number(input.amount),
          PartyA: config.shortcode,
          PartyB: String(input.receiverShortcode).trim(),
          Remarks: String(input.remarks).trim(),
          QueueTimeOutURL: getCallbackUrl("b2bTimeout"),
          ResultURL: getCallbackUrl("b2bResult"),
          AccountReference: String(input.accountReference ?? "").trim(),
        },
      };
    }
    case "businessToPochi": {
      const credentials = requireInitiatorConfig();
      return {
        path: config.businessToPochiPath,
        requestPayload: {
          OriginatorConversationID: String(input.originatorConversationId || randomUUID()),
          InitiatorName: credentials.initiatorName,
          SecurityCredential: credentials.securityCredential,
          CommandID: String(input.commandId ?? "BusinessPayToPochi"),
          Amount: Number(input.amount),
          PartyA: config.shortcode,
          PartyB: normalizePhone(String(input.phoneNumber)),
          Remarks: String(input.remarks).trim(),
          QueueTimeOutURL: getCallbackUrl("b2cTimeout"),
          ResultURL: getCallbackUrl("b2cResult"),
          Occasion: String(input.occasion ?? "").trim(),
        },
      };
    }
    case "dynamicQrCode":
      return {
        path: resolveMpesaPath(config.dynamicQrCodePath, input.pathOverride as string | undefined),
        requestPayload: { ...(input.payload as Record<string, unknown>) },
      };
    case "billManager":
      return {
        path: resolveMpesaPath(config.billManagerPath, input.pathOverride as string | undefined),
        requestPayload: { ...(input.payload as Record<string, unknown>) },
      };
    case "pullTransactions":
      return {
        path: resolveMpesaPath(
          config.pullTransactionsPath,
          input.pathOverride as string | undefined,
        ),
        requestPayload: { ...(input.payload as Record<string, unknown>) },
      };
    case "mobileNumberValidation":
      return {
        path: resolveMpesaPath(
          config.mobileNumberValidationPath,
          input.pathOverride as string | undefined,
        ),
        requestPayload: { ...(input.payload as Record<string, unknown>) },
      };
    case "transactionStatus": {
      const credentials = requireInitiatorConfig();
      return {
        path: config.transactionStatusPath,
        requestPayload: {
          Initiator: credentials.initiatorName,
          SecurityCredential: credentials.securityCredential,
          CommandID: String(input.commandId ?? "TransactionStatusQuery"),
          TransactionID: String(input.transactionId).trim(),
          PartyA: config.shortcode,
          IdentifierType: String(input.identifierType ?? "4"),
          ResultURL: getCallbackUrl("transactionStatusResult"),
          QueueTimeOutURL: getCallbackUrl("transactionStatusTimeout"),
          Remarks: String(input.remarks ?? "Transaction status query").trim(),
          Occasion: String(input.occasion ?? "").trim(),
        },
      };
    }
    case "reversal": {
      const credentials = requireInitiatorConfig();
      return {
        path: config.reversalPath,
        requestPayload: {
          Initiator: credentials.initiatorName,
          SecurityCredential: credentials.securityCredential,
          CommandID: String(input.commandId ?? "TransactionReversal"),
          TransactionID: String(input.transactionId).trim(),
          Amount: Number(input.amount),
          ReceiverParty: String(input.receiverParty || config.shortcode),
          RecieverIdentifierType: String(input.receiverIdentifierType ?? "11"),
          ResultURL: getCallbackUrl("reversalResult"),
          QueueTimeOutURL: getCallbackUrl("reversalTimeout"),
          Remarks: String(input.remarks).trim(),
          Occasion: String(input.occasion ?? "").trim(),
        },
      };
    }
    case "accountBalance": {
      const credentials = requireInitiatorConfig();
      return {
        path: config.accountBalancePath,
        requestPayload: {
          Initiator: credentials.initiatorName,
          SecurityCredential: credentials.securityCredential,
          CommandID: String(input.commandId ?? "AccountBalance"),
          PartyA: config.shortcode,
          IdentifierType: String(input.identifierType ?? "4"),
          Remarks: String(input.remarks ?? "Account balance query").trim(),
          QueueTimeOutURL: getCallbackUrl("accountBalanceTimeout"),
          ResultURL: getCallbackUrl("accountBalanceResult"),
        },
      };
    }
    case "ratiba": {
      const payload = { ...(input.payload as Record<string, unknown>) };
      if (!payload.CallBackURL) {
        payload.CallBackURL = getCallbackUrl("ratiba");
      }
      return {
        path: config.ratibaPath,
        requestPayload: payload,
      };
    }
  }
}

export async function executeMpesaOperation(
  operation: MpesaOperation,
  rawInput: unknown,
  context: GatewayRequestContext,
) {
  const schema = schemaByOperation[operation];
  const input = schema.parse(rawInput);

  if (operation === "oauthToken") {
    const token = await getAccessToken();
    return {
      success: true,
      provider: "mpesa",
      operation,
      requestId: context.requestId,
      timestamp: new Date().toISOString(),
      status: "succeeded" as const,
      httpStatus: 200,
      data: {
        tokenAvailable: Boolean(token),
        cache: getCachedTokenState(),
      },
      meta: {
        applicationId: context.applicationId,
        latencyMs: Date.now() - context.startedAt,
      },
    } satisfies NormalizedGatewayResponse<Record<string, unknown>>;
  }

  const { path, requestPayload } = preparePayload(operation, input);
  const upstream = await postToMpesa(path, requestPayload);
  const response = normalizeSuccess(operation, context, operation === "stkPush" ? 202 : 200, upstream.data);
  const record = buildTransactionRecord(operation, context, requestPayload, upstream.data, response.status);
  upsertTransaction(record);
  addRequestLog(buildLogRecord(context, operation, response, requestPayload));
  logEvent("info", "M-Pesa operation executed", {
    requestId: context.requestId,
    operation,
    applicationId: context.applicationId,
    status: response.status,
    responseCode: response.upstream?.responseCode,
    conversationId: response.upstream?.conversationId,
    latencyMs: response.meta?.latencyMs,
  });
  return response;
}

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

function findTransactionForCallback(payload: Record<string, unknown>) {
  const transactionId = typeof payload.TransactionID === "string" ? payload.TransactionID : undefined;
  const conversationId = typeof payload.ConversationID === "string" ? payload.ConversationID : undefined;
  const originatorConversationId =
    typeof payload.OriginatorConversationID === "string" ? payload.OriginatorConversationID : undefined;
  const checkoutRequestId =
    typeof payload.CheckoutRequestID === "string" ? payload.CheckoutRequestID : undefined;

  return getTransactions().find(
    (transaction) =>
      transaction.id === checkoutRequestId ||
      transaction.transactionId === transactionId ||
      transaction.providerConversationId === conversationId ||
      transaction.providerOriginatorConversationId === originatorConversationId ||
      transaction.providerRequestId === checkoutRequestId,
  );
}

function statusFromCallback(callbackName: CallbackName, payload: Record<string, unknown>): TransactionStatus {
  if (callbackName.endsWith("Timeout")) {
    return "timeout";
  }

  const resultCode = payload.ResultCode;
  if (resultCode === 0 || resultCode === "0") {
    return "succeeded";
  }

  if (resultCode === 1032 || resultCode === "1032") {
    return "cancelled";
  }

  return "failed";
}

export function processMpesaCallback(
  callbackName: CallbackName,
  payload: Record<string, unknown>,
  sourceIp?: string,
) {
  const requestId = randomUUID();
  const innerPayload = readCallbackPayload(payload);
  const callbackRecord = {
    id: randomUUID(),
    requestId,
    callbackName,
    provider: "mpesa" as const,
    receivedAt: new Date().toISOString(),
    sourceIp,
    processingStatus: "accepted" as const,
    payload: sanitizeForLogs(payload),
  };

  addCallback(callbackRecord);

  const transaction = findTransactionForCallback(innerPayload);
  if (transaction) {
    transaction.status = statusFromCallback(callbackName, innerPayload);
    transaction.updatedAt = new Date().toISOString();
    transaction.transactionId = transaction.transactionId ?? inferTransactionId(innerPayload);
    transaction.providerConversationId =
      transaction.providerConversationId ??
      (typeof innerPayload.ConversationID === "string" ? innerPayload.ConversationID : undefined);
    transaction.providerOriginatorConversationId =
      transaction.providerOriginatorConversationId ??
      (typeof innerPayload.OriginatorConversationID === "string"
        ? innerPayload.OriginatorConversationID
        : undefined);
    transaction.callbackPayloads.unshift(sanitizeForLogs(payload));
    upsertTransaction(transaction);
  }

  addRequestLog({
    id: randomUUID(),
    requestId,
    applicationId: "safaricom",
    provider: "mpesa",
    operation: "callback",
    route: `/api/mpesa/callbacks/${callbackName}`,
    method: "POST",
    status: 200,
    providerStatus: statusFromCallback(callbackName, innerPayload),
    providerRequestId:
      typeof innerPayload.MerchantRequestID === "string" ? innerPayload.MerchantRequestID : undefined,
    providerConversationId:
      typeof innerPayload.ConversationID === "string" ? innerPayload.ConversationID : undefined,
    latencyMs: 0,
    timestamp: new Date().toISOString(),
    requestBody: sanitizeForLogs(payload),
    responseBody: { ResultCode: 0, ResultDesc: "Accepted" },
  });

  logEvent("info", "M-Pesa callback received", {
    requestId,
    callbackName,
    sourceIp,
    resultCode: innerPayload.ResultCode,
    conversationId: innerPayload.ConversationID,
    originatorConversationId: innerPayload.OriginatorConversationID,
  });

  return {
    ResultCode: 0,
    ResultDesc: "Accepted",
  };
}

export async function getGatewayOverview(): Promise<GatewayOverview> {
  const transactions = getTransactions();
  const logs = getRequestLogs();
  const callbacks = getCallbacks();

  let oauthHealthy = false;
  try {
    await getAccessToken();
    oauthHealthy = true;
  } catch (error) {
    logEvent("warn", "OAuth health probe failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  const failedTransactions = transactions.filter((item) => item.status === "failed").length;
  return {
    environment: getGatewayConfig().mpesaEnvironment,
    providerHealth: oauthHealthy ? "healthy" : "degraded",
    oauthHealthy,
    callbackCount: callbacks.length,
    requestCount: logs.length,
    recentFailures: failedTransactions,
    transactions: {
      accepted: transactions.filter((item) => item.status === "accepted").length,
      pending: transactions.filter((item) => item.status === "pending").length,
      succeeded: transactions.filter((item) => item.status === "succeeded").length,
      failed: failedTransactions,
    },
  };
}
