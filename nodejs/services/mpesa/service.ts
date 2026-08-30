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
import { getAdminDashboardSnapshot } from "@/lib/repositories/admin-dashboard-store";
import {
  linkStoredCallbackToTransaction,
  persistCallbackRecord,
} from "@/lib/repositories/callback-store";
import {
  persistRequestLog,
  persistTransactionSnapshot,
} from "@/lib/repositories/telemetry-store";
import { listDatabaseTransactions } from "@/lib/repositories/transaction-store";
import {
  findDatabaseTransactionForCallbackPayload,
  persistDatabaseTransactionRecord,
} from "@/lib/repositories/transaction-write-store";
import {
  addCallback,
  addRequestLog,
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

function trimObjectString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function buildBillManagerOptinPayload(input: Record<string, unknown>) {
  const config = getGatewayConfig();
  const payload: Record<string, unknown> = {
    shortcode: config.shortcode,
    email: config.billManagerEmail,
    officialContact: config.billManagerOfficialContact,
    sendReminders: config.billManagerSendReminders,
    logo: config.billManagerLogo,
    callbackurl: config.legacyCallbackUrls.billManager,
    ...input,
  };

  payload.shortcode = trimObjectString(payload.shortcode);
  payload.email = trimObjectString(payload.email);
  payload.officialContact = trimObjectString(payload.officialContact);
  payload.callbackurl = trimObjectString(payload.callbackurl);

  if (!payload.shortcode) {
    throw new GatewayValidationError("MPESA_SHORTCODE is required for Bill Manager opt-in");
  }

  if (!payload.email) {
    throw new GatewayValidationError("MPESA_BILL_MANAGER_EMAIL is required for Bill Manager opt-in");
  }

  if (!payload.officialContact) {
    throw new GatewayValidationError(
      "MPESA_BILL_MANAGER_OFFICIAL_CONTACT is required for Bill Manager opt-in",
    );
  }

  if (!payload.callbackurl) {
    throw new GatewayValidationError(
      "MPESA_BILL_MANAGER_CALLBACK_URL or PUBLIC_BASE_URL is required for Bill Manager opt-in",
    );
  }

  return payload;
}

function buildPullTransactionsRegistrationPayload(input: Record<string, unknown>) {
  const config = getGatewayConfig();
  const payload: Record<string, unknown> = {
    ShortCode: config.shortcode,
    RequestType: config.pullTransactionsRequestType,
    NominatedNumber: config.pullTransactionsNominatedNumber,
    CallBackURL: config.legacyCallbackUrls.pullTransactions,
    ...input,
  };

  payload.ShortCode = trimObjectString(payload.ShortCode);
  payload.RequestType = trimObjectString(payload.RequestType) ?? "Pull";
  payload.NominatedNumber = trimObjectString(payload.NominatedNumber);
  payload.CallBackURL = trimObjectString(payload.CallBackURL);

  if (!payload.ShortCode) {
    throw new GatewayValidationError("MPESA_SHORTCODE is required for pull transactions registration");
  }

  if (!payload.CallBackURL) {
    throw new GatewayValidationError(
      "MPESA_PULL_TRANSACTIONS_CALLBACK_URL or PUBLIC_BASE_URL is required for pull transactions registration",
    );
  }

  if (!payload.NominatedNumber) {
    throw new GatewayValidationError(
      "MPESA_PULL_TRANSACTIONS_NOMINATED_NUMBER is required for pull transactions registration",
    );
  }

  return payload;
}

function unwrapNestedPayload(input: Record<string, unknown>) {
  if ("payload" in input && input.payload && typeof input.payload === "object") {
    return { ...(input.payload as Record<string, unknown>) };
  }

  return { ...input };
}

function readNumericRequestField(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function readStringRequestField(payload: Record<string, unknown>, key: string) {
  return typeof payload[key] === "string" && payload[key].trim()
    ? payload[key]
    : typeof payload[key] === "number"
      ? String(payload[key])
      : undefined;
}

function inferTransactionParties(requestPayload: Record<string, unknown>) {
  return {
    partyA:
      readStringRequestField(requestPayload, "PartyA") ??
      readStringRequestField(requestPayload, "PhoneNumber") ??
      readStringRequestField(requestPayload, "Msisdn"),
    partyB:
      readStringRequestField(requestPayload, "PartyB") ??
      readStringRequestField(requestPayload, "ShortCode") ??
      readStringRequestField(requestPayload, "ReceiverParty"),
  };
}

function inferInitialProviderRequestId(requestPayload: Record<string, unknown>) {
  return (
    readStringRequestField(requestPayload, "OriginatorConversationID") ??
    readStringRequestField(requestPayload, "ConversationID") ??
    readStringRequestField(requestPayload, "CheckoutRequestID")
  );
}

function inferAccountReference(requestPayload: Record<string, unknown>) {
  return (
    readStringRequestField(requestPayload, "AccountReference") ??
    readStringRequestField(requestPayload, "BillRefNumber")
  );
}

function buildInitialTransactionRecord(
  operation: MpesaOperation,
  context: GatewayRequestContext,
  requestPayload: Record<string, unknown>,
) {
  const now = new Date().toISOString();
  const { partyA, partyB } = inferTransactionParties(requestPayload);

  return {
    id: context.requestId,
    requestId: context.requestId,
    provider: "mpesa" as const,
    operation,
    applicationId: context.applicationId,
    status: "pending" as const,
    amount: readNumericRequestField(requestPayload, "Amount"),
    partyA,
    partyB,
    accountReference: inferAccountReference(requestPayload),
    providerRequestId: inferInitialProviderRequestId(requestPayload),
    providerOriginatorConversationId: readStringRequestField(requestPayload, "OriginatorConversationID"),
    idempotencyKey: context.idempotencyKey,
    createdAt: now,
    updatedAt: now,
    requestPayload: sanitizeForLogs(requestPayload),
    callbackPayloads: [],
  } satisfies TransactionRecord;
}

function buildTransactionRecord(
  operation: MpesaOperation,
  context: GatewayRequestContext,
  requestPayload: Record<string, unknown>,
  responsePayload: Record<string, unknown>,
  status: TransactionStatus,
  existingRecord?: TransactionRecord,
) {
  const now = new Date().toISOString();
  const checkoutId =
    typeof responsePayload.CheckoutRequestID === "string" ? responsePayload.CheckoutRequestID : undefined;
  const merchantRequestId =
    typeof responsePayload.MerchantRequestID === "string" ? responsePayload.MerchantRequestID : undefined;
  const { partyA, partyB } = inferTransactionParties(requestPayload);

  return {
    id: existingRecord?.id ?? context.requestId,
    requestId: context.requestId,
    provider: "mpesa" as const,
    operation,
    applicationId: context.applicationId,
    status,
    amount: existingRecord?.amount ?? readNumericRequestField(requestPayload, "Amount"),
    partyA: existingRecord?.partyA ?? partyA,
    partyB: existingRecord?.partyB ?? partyB,
    accountReference: existingRecord?.accountReference ?? inferAccountReference(requestPayload),
    transactionId: inferTransactionId(responsePayload) ?? existingRecord?.transactionId,
    providerRequestId:
      checkoutId ??
      merchantRequestId ??
      (typeof responsePayload.OriginatorConversationID === "string"
        ? responsePayload.OriginatorConversationID
        : undefined) ??
      existingRecord?.providerRequestId,
    providerConversationId:
      (typeof responsePayload.ConversationID === "string" ? responsePayload.ConversationID : undefined) ??
      existingRecord?.providerConversationId,
    providerOriginatorConversationId:
      (typeof responsePayload.OriginatorConversationID === "string"
        ? responsePayload.OriginatorConversationID
        : undefined) ?? existingRecord?.providerOriginatorConversationId,
    idempotencyKey: context.idempotencyKey,
    createdAt: existingRecord?.createdAt ?? now,
    updatedAt: now,
    requestPayload: existingRecord?.requestPayload ?? sanitizeForLogs(requestPayload),
    responsePayload: sanitizeForLogs(responsePayload),
    callbackPayloads: existingRecord?.callbackPayloads ?? [],
  } satisfies TransactionRecord;
}

function buildFailedTransactionRecord(record: TransactionRecord, error: unknown) {
  const errorPayload =
    error instanceof GatewayError
      ? {
          code: error.code,
          message: error.message,
          details: sanitizeForLogs(error.details ?? {}),
        }
      : error instanceof MpesaError
        ? {
            code: error.code,
            message: error.message,
            providerCode: extractProviderCode(error.upstream),
            providerMessage: extractProviderMessage(error.upstream),
            upstream: sanitizeForLogs(error.upstream ?? {}),
          }
        : {
            message: error instanceof Error ? error.message : "Unknown gateway failure",
          };

  return {
    ...record,
    status: "failed" as const,
    updatedAt: new Date().toISOString(),
    responsePayload: errorPayload,
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
    case "billManagerOptin":
      return {
        path: config.billManagerOptinPath,
        requestPayload: buildBillManagerOptinPayload(input),
      };
    case "billManagerChangeOptinDetails":
      return {
        path: config.billManagerChangeOptinDetailsPath,
        requestPayload: buildBillManagerOptinPayload(input),
      };
    case "billManagerCreateSingleInvoice":
      return {
        path: config.billManagerCreateSingleInvoicePath,
        requestPayload: unwrapNestedPayload(input),
      };
    case "billManagerCreateBulkInvoices":
      return {
        path: config.billManagerCreateBulkInvoicesPath,
        requestPayload: unwrapNestedPayload(input),
      };
    case "billManagerCancelSingleInvoice":
      return {
        path: config.billManagerCancelSingleInvoicePath,
        requestPayload: { ...input },
      };
    case "billManagerCancelBulkInvoices":
      return {
        path: config.billManagerCancelBulkInvoicesPath,
        requestPayload: { ...input },
      };
    case "billManagerReconciliation":
      return {
        path: config.billManagerReconciliationPath,
        requestPayload: unwrapNestedPayload(input),
      };
    case "pullTransactions":
      return {
        path: resolveMpesaPath(
          config.pullTransactionsPath,
          input.pathOverride as string | undefined,
        ),
        requestPayload: { ...(input.payload as Record<string, unknown>) },
      };
    case "pullTransactionsQuery":
      return {
        path: config.pullTransactionsQueryPath,
        requestPayload: { ...input },
      };
    case "pullTransactionsRegister":
      return {
        path: config.pullTransactionsRegisterPath,
        requestPayload: buildPullTransactionsRegistrationPayload(input),
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
  const initialRecord = buildInitialTransactionRecord(operation, context, requestPayload);
  upsertTransaction(initialRecord);
  const persistedDatabaseTransaction = await persistDatabaseTransactionRecord(initialRecord, context).catch((error) => {
    logEvent("warn", "Unable to persist transaction record", {
      requestId: context.requestId,
      operation,
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  });

  try {
    const upstream = await postToMpesa(path, requestPayload);
    const response = normalizeSuccess(operation, context, operation === "stkPush" ? 202 : 200, upstream.data);
    const record = buildTransactionRecord(
      operation,
      context,
      requestPayload,
      upstream.data,
      response.status,
      initialRecord,
    );
    upsertTransaction(record);
    await persistDatabaseTransactionRecord(record, context, persistedDatabaseTransaction).catch((error) => {
      logEvent("warn", "Unable to persist transaction record", {
        requestId: context.requestId,
        operation,
        message: error instanceof Error ? error.message : "unknown",
      });
    });
    await persistTransactionSnapshot(record).catch((error) => {
      logEvent("warn", "Unable to persist transaction snapshot", {
        requestId: context.requestId,
        operation,
        message: error instanceof Error ? error.message : "unknown",
      });
    });

    const requestLog = buildLogRecord(context, operation, response, requestPayload);
    addRequestLog(requestLog);
    await persistRequestLog(requestLog).catch((error) => {
      logEvent("warn", "Unable to persist request log", {
        requestId: context.requestId,
        operation,
        message: error instanceof Error ? error.message : "unknown",
      });
    });
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
  } catch (error) {
    const failedRecord = buildFailedTransactionRecord(initialRecord, error);
    upsertTransaction(failedRecord);
    await persistDatabaseTransactionRecord(
      failedRecord,
      context,
      persistedDatabaseTransaction,
    ).catch((persistError) => {
      logEvent("warn", "Unable to persist failed transaction record", {
        requestId: context.requestId,
        operation,
        message: persistError instanceof Error ? persistError.message : "unknown",
      });
    });
    await persistTransactionSnapshot(failedRecord).catch((persistError) => {
      logEvent("warn", "Unable to persist failed transaction snapshot", {
        requestId: context.requestId,
        operation,
        message: persistError instanceof Error ? persistError.message : "unknown",
      });
    });
    throw error;
  }
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

function readCallbackItemName(item: Record<string, unknown>) {
  if (typeof item.Key === "string" && item.Key.trim()) {
    return item.Key;
  }

  if (typeof item.Name === "string" && item.Name.trim()) {
    return item.Name;
  }

  return undefined;
}

function inferCallbackTransactionId(payload: Record<string, unknown>) {
  const directTransactionId = inferTransactionId(payload);
  if (directTransactionId) {
    return directTransactionId;
  }

  const directReceiptId =
    typeof payload.TransID === "string"
      ? payload.TransID
      : typeof payload.MpesaReceiptNumber === "string"
        ? payload.MpesaReceiptNumber
        : undefined;
  if (directReceiptId) {
    return directReceiptId;
  }

  const receiptMatch = readCallbackMetadataItems(payload).find(
    (item) =>
      ["MpesaReceiptNumber", "TransactionID"].includes(readCallbackItemName(item) ?? "") &&
      typeof item.Value === "string",
  );

  return typeof receiptMatch?.Value === "string" ? receiptMatch.Value : undefined;
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

function readCallbackNamedValue(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  const items = [...readCallbackMetadataItems(payload), ...readCallbackResultParameterItems(payload)];
  const match = items.find(
    (item) =>
      keys.includes(readCallbackItemName(item) ?? "") &&
      item.Value !== undefined &&
      item.Value !== null &&
      item.Value !== "",
  );

  return match?.Value;
}

function readCallbackNumber(payload: Record<string, unknown>, keys: string[]) {
  const value = readCallbackNamedValue(payload, keys);
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function inferCallbackProviderRequestId(payload: Record<string, unknown>) {
  return (
    (typeof payload.CheckoutRequestID === "string" ? payload.CheckoutRequestID : undefined) ??
    (typeof payload.OriginatorConversationID === "string"
      ? payload.OriginatorConversationID
      : undefined) ??
    (typeof payload.ConversationID === "string" ? payload.ConversationID : undefined) ??
    (typeof payload.MerchantRequestID === "string" ? payload.MerchantRequestID : undefined) ??
    inferCallbackTransactionId(payload)
  );
}

function inferCallbackOperation(callbackName: CallbackName): MpesaOperation | null {
  switch (callbackName) {
    case "stk":
      return "stkPush";
    case "c2bConfirmation":
    case "c2bValidation":
      return "c2bRegister";
    case "b2cResult":
    case "b2cTimeout":
      return "b2c";
    case "b2bResult":
    case "b2bTimeout":
      return "b2b";
    case "reversalResult":
    case "reversalTimeout":
      return "reversal";
    case "pullTransactions":
      return "pullTransactions";
    default:
      return null;
  }
}

function allowedTransactionOperationsForCallback(callbackName: CallbackName): MpesaOperation[] | null {
  switch (callbackName) {
    case "stk":
      return ["stkPush"];
    case "c2bConfirmation":
    case "c2bValidation":
      return ["stkPush", "c2bSimulate"];
    case "b2cResult":
    case "b2cTimeout":
      return ["b2c", "businessToPochi"];
    case "b2bResult":
    case "b2bTimeout":
      return ["b2b"];
    case "reversalResult":
    case "reversalTimeout":
      return ["reversal"];
    case "transactionStatusResult":
    case "transactionStatusTimeout":
      return ["transactionStatus"];
    case "accountBalanceResult":
    case "accountBalanceTimeout":
      return ["accountBalance"];
    case "pullTransactions":
      return ["pullTransactions", "pullTransactionsQuery", "pullTransactionsRegister"];
    case "billManager":
      return [
        "billManager",
        "billManagerOptin",
        "billManagerChangeOptinDetails",
        "billManagerCreateSingleInvoice",
        "billManagerCreateBulkInvoices",
        "billManagerCancelSingleInvoice",
        "billManagerCancelBulkInvoices",
        "billManagerReconciliation",
      ];
    case "ratiba":
      return ["ratiba"];
    default:
      return null;
  }
}

function inferCallbackAmount(callbackName: CallbackName, payload: Record<string, unknown>) {
  switch (callbackName) {
    case "stk":
      return readCallbackNumber(payload, ["Amount"]);
    case "c2bConfirmation":
    case "c2bValidation":
    case "pullTransactions":
      return readCallbackNumber(payload, ["TransAmount", "Amount"]);
    case "b2cResult":
    case "b2bResult":
    case "reversalResult":
      return readCallbackNumber(payload, ["TransactionAmount", "Amount", "DebitAmount", "CreditAmount"]);
    default:
      return readCallbackNumber(payload, ["Amount"]);
  }
}

function buildSyntheticTransactionFromCallback(
  callbackName: CallbackName,
  payload: Record<string, unknown>,
  requestId: string,
): TransactionRecord | null {
  if (callbackName === "c2bConfirmation" || callbackName === "c2bValidation") {
    return null;
  }

  const operation = inferCallbackOperation(callbackName);
  const amount = inferCallbackAmount(callbackName, payload);
  if (!operation || amount === undefined || amount <= 0) {
    return null;
  }

  const now = new Date().toISOString();
  const customerPhoneValue = readCallbackNamedValue(payload, ["PhoneNumber", "MSISDN", "Msisdn"]);
  const customerPhone = typeof customerPhoneValue === "string" ? customerPhoneValue : undefined;
  const providerRequestId = inferCallbackProviderRequestId(payload);
  const accountReferenceValue = readCallbackNamedValue(payload, [
    "BillRefNumber",
    "AccountReference",
    "InvoiceNumber",
  ]);
  const accountReference = typeof accountReferenceValue === "string" ? accountReferenceValue : undefined;
  const shortCodeValue = readCallbackNamedValue(payload, ["BusinessShortCode", "ShortCode"]);
  const shortCode = typeof shortCodeValue === "string" ? shortCodeValue : undefined;

  return {
    id:
      (typeof payload.CheckoutRequestID === "string" ? payload.CheckoutRequestID : undefined) ??
      inferCallbackTransactionId(payload) ??
      (typeof payload.ConversationID === "string" ? payload.ConversationID : undefined) ??
      (typeof payload.OriginatorConversationID === "string" ? payload.OriginatorConversationID : undefined) ??
      providerRequestId ??
      requestId,
    requestId,
    provider: "mpesa",
    operation,
    applicationId: "safaricom",
    status: statusFromCallback(callbackName, payload),
    amount,
    partyA:
      operation === "b2c" || operation === "b2b" || operation === "reversal"
        ? getGatewayConfig().shortcode
        : customerPhone,
    partyB:
      operation === "b2c" || operation === "b2b" || operation === "reversal"
        ? customerPhone
        : shortCode ?? getGatewayConfig().shortcode,
    accountReference,
    transactionId: inferCallbackTransactionId(payload),
    providerRequestId,
    providerConversationId:
      typeof payload.ConversationID === "string" ? payload.ConversationID : undefined,
    providerOriginatorConversationId:
      typeof payload.OriginatorConversationID === "string"
        ? payload.OriginatorConversationID
        : undefined,
    createdAt: now,
    updatedAt: now,
    requestPayload: {},
    callbackPayloads: [],
  };
}

function minutesSince(timestamp?: string) {
  if (!timestamp) {
    return undefined;
  }

  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(0, Math.floor((Date.now() - parsed) / 60000));
}

function normalizeDigits(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && value.trim()) {
    const digits = value.replace(/\D/g, "");
    return digits || undefined;
  }

  return undefined;
}

function normalizeReference(value?: string) {
  return value?.trim().toLowerCase() || undefined;
}

function amountsMatch(left?: number, right?: number) {
  return left !== undefined && right !== undefined && Math.abs(left - right) < 0.01;
}

function matchesC2bConfirmationToPendingStk(
  transaction: TransactionRecord,
  payload: Record<string, unknown>,
) {
  if (transaction.operation !== "stkPush" || !["pending", "accepted"].includes(transaction.status)) {
    return false;
  }

  const callbackAmount = readCallbackNumber(payload, ["TransAmount", "Amount"]);
  if (!amountsMatch(callbackAmount, transaction.amount)) {
    return false;
  }

  const callbackPhone = normalizeDigits(readCallbackNamedValue(payload, ["MSISDN", "PhoneNumber", "Msisdn"]));
  const transactionPhone = normalizeDigits(transaction.partyA);
  if (callbackPhone && transactionPhone && callbackPhone !== transactionPhone) {
    return false;
  }

  const callbackShortCode = normalizeDigits(
    readCallbackNamedValue(payload, ["BusinessShortCode", "ShortCode"]),
  );
  const transactionShortCode = normalizeDigits(transaction.partyB);
  if (callbackShortCode && transactionShortCode && callbackShortCode !== transactionShortCode) {
    return false;
  }

  const callbackReference = normalizeReference(
    typeof readCallbackNamedValue(payload, ["BillRefNumber", "AccountReference", "InvoiceNumber"]) === "string"
      ? String(readCallbackNamedValue(payload, ["BillRefNumber", "AccountReference", "InvoiceNumber"]))
      : undefined,
  );
  const transactionReference = normalizeReference(transaction.accountReference);
  if (callbackReference && transactionReference && callbackReference !== transactionReference) {
    return false;
  }

  const createdAt = Date.parse(transaction.createdAt);
  if (Number.isFinite(createdAt) && Date.now() - createdAt > 30 * 60 * 1000) {
    return false;
  }

  return Boolean(
    (callbackPhone && transactionPhone) ||
      (callbackReference && transactionReference) ||
      (callbackShortCode && transactionShortCode),
  );
}

function findPendingStkTransactionForC2bConfirmation(transactions: TransactionRecord[], payload: Record<string, unknown>) {
  const candidates = transactions.filter((transaction) =>
    matchesC2bConfirmationToPendingStk(transaction, payload),
  );

  if (candidates.length !== 1) {
    return null;
  }

  return candidates[0] ?? null;
}

function isTerminalTransactionStatus(status: TransactionStatus) {
  return ["succeeded", "failed", "cancelled", "timeout"].includes(status);
}

function readResultCode(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return undefined;
}

function shouldReconcilePendingStkTransaction(
  transaction: TransactionRecord,
  now: number,
  minAgeMs: number,
  maxAgeMs: number,
) {
  if (transaction.operation !== "stkPush" || !["pending", "accepted"].includes(transaction.status)) {
    return false;
  }

  if (!transaction.providerRequestId) {
    return false;
  }

  const createdAt = Date.parse(transaction.createdAt);
  if (!Number.isFinite(createdAt)) {
    return false;
  }

  const ageMs = now - createdAt;
  return ageMs >= minAgeMs && ageMs <= maxAgeMs;
}

function buildReconciliationCallbackPayload(payload: Record<string, unknown>) {
  return {
    reconciliationSource: "stkQuery",
    reconciledAt: new Date().toISOString(),
    ...sanitizeForLogs(payload),
  };
}

function statusFromStkQueryPayload(payload: Record<string, unknown>, currentStatus: TransactionStatus) {
  const resolved = statusFromCallback("stk", payload);
  return resolved === "accepted" ? currentStatus : resolved;
}

function buildDefaultGatewayOverview(oauthHealthy: boolean): GatewayOverview {
  return {
    environment: getGatewayConfig().mpesaEnvironment,
    providerHealth: oauthHealthy ? "healthy" : "degraded",
    oauthHealthy,
    callbackCount: 0,
    requestCount: 0,
    failedRequestCount: 0,
    slowRequestCount: 0,
    activeApplicationCount: 0,
    recentFailures: 0,
    collectionsToday: 0,
    payoutsToday: 0,
    netFlowToday: 0,
    balanceFreshnessMinutes: undefined,
    oldestPendingMinutes: undefined,
    projectionUpdatedAt: undefined,
    shortcodeBalance: {
      status: "unavailable",
      accountCount: 0,
    },
    transactions: {
      accepted: 0,
      pending: 0,
      succeeded: 0,
      failed: 0,
    },
  };
}

function matchesTransactionByCallbackPayload(
  transaction: TransactionRecord,
  payload: Record<string, unknown>,
  allowedOperations?: MpesaOperation[] | null,
) {
  if (allowedOperations?.length && !allowedOperations.includes(transaction.operation)) {
    return false;
  }

  const transactionId = inferCallbackTransactionId(payload);
  const conversationId = typeof payload.ConversationID === "string" ? payload.ConversationID : undefined;
  const originatorConversationId =
    typeof payload.OriginatorConversationID === "string" ? payload.OriginatorConversationID : undefined;
  const checkoutRequestId =
    typeof payload.CheckoutRequestID === "string" ? payload.CheckoutRequestID : undefined;
  const providerRequestId = inferCallbackProviderRequestId(payload);

  return (
    (checkoutRequestId !== undefined && transaction.id === checkoutRequestId) ||
    (transactionId !== undefined && transaction.transactionId === transactionId) ||
    (conversationId !== undefined && transaction.providerConversationId === conversationId) ||
    (
      originatorConversationId !== undefined &&
      transaction.providerOriginatorConversationId === originatorConversationId
    ) ||
    (checkoutRequestId !== undefined && transaction.providerRequestId === checkoutRequestId) ||
    (providerRequestId !== undefined && transaction.providerRequestId === providerRequestId)
  );
}

async function findTransactionForCallback(callbackName: CallbackName, payload: Record<string, unknown>) {
  const allowedOperations = allowedTransactionOperationsForCallback(callbackName);
  const runtimeTransactions = getTransactions();
  const runtimeMatch = runtimeTransactions.find((transaction) =>
    matchesTransactionByCallbackPayload(transaction, payload, allowedOperations),
  );
  if (runtimeMatch) {
    return runtimeMatch;
  }

  const databaseTransactions = (await listDatabaseTransactions(500).catch(() => null)) ?? [];
  const databaseMatch = databaseTransactions.find((transaction) =>
    matchesTransactionByCallbackPayload(transaction, payload, allowedOperations),
  );
  if (databaseMatch) {
    return databaseMatch;
  }

  if (callbackName === "c2bConfirmation") {
    return (
      findPendingStkTransactionForC2bConfirmation(runtimeTransactions, payload) ??
      findPendingStkTransactionForC2bConfirmation(databaseTransactions, payload)
    );
  }

  return null;
}

function statusFromCallback(callbackName: CallbackName, payload: Record<string, unknown>): TransactionStatus {
  if (callbackName.endsWith("Timeout")) {
    return "timeout";
  }

  const resultCode = payload.ResultCode;
  if (resultCode === undefined || resultCode === null || resultCode === "") {
    if (callbackName === "c2bConfirmation" || callbackName === "pullTransactions") {
      return "succeeded";
    }

    return "accepted";
  }

  if (resultCode === 0 || resultCode === "0") {
    return "succeeded";
  }

  if (resultCode === 1032 || resultCode === "1032") {
    return "cancelled";
  }

  return "failed";
}

export async function processMpesaCallback(
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

  const storedCallbackId = await persistCallbackRecord(callbackRecord);
  addCallback(callbackRecord);

  const allowedOperations = allowedTransactionOperationsForCallback(callbackName) ?? undefined;
  const databaseTransactionMatch =
    await findDatabaseTransactionForCallbackPayload(innerPayload, allowedOperations).catch(() => null);
  const transaction =
    (await findTransactionForCallback(callbackName, innerPayload)) ??
    buildSyntheticTransactionFromCallback(callbackName, innerPayload, requestId);
  let persistedDatabaseTransaction = databaseTransactionMatch;
  if (!transaction && (callbackName === "c2bConfirmation" || callbackName === "c2bValidation")) {
    logEvent("warn", "M-Pesa C2B callback did not match an existing transaction", {
      requestId,
      callbackName,
      providerRequestId: inferCallbackProviderRequestId(innerPayload),
      transactionId: inferCallbackTransactionId(innerPayload),
      amount: inferCallbackAmount(callbackName, innerPayload),
      accountReference:
        typeof readCallbackNamedValue(innerPayload, ["BillRefNumber", "AccountReference", "InvoiceNumber"]) ===
        "string"
          ? readCallbackNamedValue(innerPayload, ["BillRefNumber", "AccountReference", "InvoiceNumber"])
          : undefined,
    });
  }
  if (transaction) {
    transaction.status = statusFromCallback(callbackName, innerPayload);
    transaction.updatedAt = new Date().toISOString();
    transaction.transactionId = transaction.transactionId ?? inferCallbackTransactionId(innerPayload);
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
    persistedDatabaseTransaction = await persistDatabaseTransactionRecord(
      transaction,
      {
        requestId,
        applicationId: transaction.applicationId,
        merchantId: databaseTransactionMatch?.merchantId,
        route: `/api/mpesa/callbacks/${callbackName}`,
        method: "POST",
        startedAt: Date.now(),
      },
      databaseTransactionMatch,
    ).catch((error) => {
      logEvent("warn", "Unable to persist callback-updated database transaction", {
        requestId,
        callbackName,
        message: error instanceof Error ? error.message : "unknown",
      });
      return null;
    });
    await persistTransactionSnapshot(transaction).catch((error) => {
      logEvent("warn", "Unable to persist callback-updated transaction snapshot", {
        requestId,
        callbackName,
        message: error instanceof Error ? error.message : "unknown",
      });
    });
  }

  if (storedCallbackId && persistedDatabaseTransaction) {
    await linkStoredCallbackToTransaction(
      storedCallbackId,
      persistedDatabaseTransaction.id,
      persistedDatabaseTransaction.merchantId,
    ).catch((error) => {
      logEvent("warn", "Unable to link callback to transaction", {
        requestId,
        callbackName,
        message: error instanceof Error ? error.message : "unknown",
      });
    });
  }

  const requestLog = {
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
  } satisfies RequestLogRecord;
  addRequestLog(requestLog);
  await persistRequestLog(requestLog).catch((error) => {
    logEvent("warn", "Unable to persist callback request log", {
      requestId,
      callbackName,
      message: error instanceof Error ? error.message : "unknown",
    });
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

export async function reconcilePendingStkTransactions(options?: {
  limit?: number;
  minAgeMinutes?: number;
  maxAgeMinutes?: number;
}) {
  const now = Date.now();
  const limit = Math.max(1, Math.min(options?.limit ?? 20, 100));
  const minAgeMinutes = Math.max(1, options?.minAgeMinutes ?? 5);
  const maxAgeMinutes = Math.max(minAgeMinutes, options?.maxAgeMinutes ?? 24 * 60);
  const minAgeMs = minAgeMinutes * 60 * 1000;
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  const transactions = (await listDatabaseTransactions(Math.max(limit * 5, 100)).catch(() => null)) ?? [];
  const candidates = transactions
    .filter((transaction) => shouldReconcilePendingStkTransaction(transaction, now, minAgeMs, maxAgeMs))
    .slice(0, limit);

  const summary = {
    checked: candidates.length,
    updated: 0,
    stillPending: 0,
    failedQueries: 0,
    items: [] as Array<{
      id: string;
      providerRequestId?: string;
      previousStatus: TransactionStatus;
      status: TransactionStatus;
      resultCode?: string;
      outcome: "updated" | "still_pending" | "query_failed";
      message?: string;
    }>,
  };

  for (const transaction of candidates) {
    const requestId = randomUUID();
    const { path, requestPayload } = preparePayload("stkQuery", {
      checkoutRequestId: transaction.providerRequestId,
    });
    const context = {
      requestId,
      applicationId: transaction.applicationId,
      route: "/api/admin/mpesa/reconcile-pending-stk",
      method: "POST",
      startedAt: Date.now(),
    } satisfies GatewayRequestContext;

    try {
      const upstream = await postToMpesa(path, requestPayload);
      const response = normalizeSuccess("stkQuery", context, 200, upstream.data);
      const resultPayload = sanitizeForLogs(upstream.data);
      const nextStatus = statusFromStkQueryPayload(resultPayload, transaction.status);
      const resultCode = readResultCode(resultPayload.ResultCode);

      const requestLog = buildLogRecord(context, "stkQuery", response, requestPayload);
      addRequestLog(requestLog);
      await persistRequestLog(requestLog).catch((error) => {
        logEvent("warn", "Unable to persist STK reconciliation request log", {
          requestId,
          checkoutRequestId: transaction.providerRequestId,
          message: error instanceof Error ? error.message : "unknown",
        });
      });

      if (!isTerminalTransactionStatus(nextStatus)) {
        summary.stillPending += 1;
        summary.items.push({
          id: transaction.id,
          providerRequestId: transaction.providerRequestId,
          previousStatus: transaction.status,
          status: transaction.status,
          resultCode,
          outcome: "still_pending",
        });
        continue;
      }

      const updatedTransaction = {
        ...transaction,
        status: nextStatus,
        updatedAt: new Date().toISOString(),
        callbackPayloads: [
          buildReconciliationCallbackPayload(resultPayload),
          ...transaction.callbackPayloads,
        ],
      } satisfies TransactionRecord;
      upsertTransaction(updatedTransaction);
      await persistDatabaseTransactionRecord(updatedTransaction, context).catch((error) => {
        throw new Error(error instanceof Error ? error.message : "Unable to persist reconciled transaction");
      });
      await persistTransactionSnapshot(updatedTransaction).catch((error) => {
        logEvent("warn", "Unable to persist reconciled transaction snapshot", {
          requestId,
          checkoutRequestId: transaction.providerRequestId,
          message: error instanceof Error ? error.message : "unknown",
        });
      });
      summary.updated += 1;
      summary.items.push({
        id: updatedTransaction.id,
        providerRequestId: updatedTransaction.providerRequestId,
        previousStatus: transaction.status,
        status: updatedTransaction.status,
        resultCode,
        outcome: "updated",
      });
    } catch (error) {
      summary.failedQueries += 1;
      summary.items.push({
        id: transaction.id,
        providerRequestId: transaction.providerRequestId,
        previousStatus: transaction.status,
        status: transaction.status,
        outcome: "query_failed",
        message: error instanceof Error ? error.message : "unknown",
      });
      logEvent("warn", "STK reconciliation query failed", {
        requestId,
        checkoutRequestId: transaction.providerRequestId,
        message: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return summary;
}

export async function getGatewayOverview(): Promise<GatewayOverview> {
  let oauthHealthy = false;
  try {
    await getAccessToken();
    oauthHealthy = true;
  } catch (error) {
    logEvent("warn", "OAuth health probe failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  const snapshot = await getAdminDashboardSnapshot().catch((error) => {
    logEvent("warn", "Admin dashboard snapshot load failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  });

  if (!snapshot) {
    return buildDefaultGatewayOverview(oauthHealthy);
  }

  return {
    environment: getGatewayConfig().mpesaEnvironment,
    providerHealth: oauthHealthy ? "healthy" : "degraded",
    oauthHealthy,
    callbackCount: snapshot.callbackCount,
    requestCount: snapshot.requestCount,
    failedRequestCount: snapshot.failedRequestCount,
    slowRequestCount: snapshot.slowRequestCount,
    activeApplicationCount: snapshot.activeApplicationCount,
    recentFailures: snapshot.transactionFailedCount,
    collectionsToday: snapshot.collectionsToday,
    payoutsToday: snapshot.payoutsToday,
    netFlowToday: snapshot.netFlowToday,
    balanceFreshnessMinutes: minutesSince(snapshot.latestBalanceCallbackAt),
    oldestPendingMinutes: minutesSince(snapshot.oldestPendingCreatedAt),
    projectionUpdatedAt: snapshot.projectionUpdatedAt,
    shortcodeBalance: {
      status: snapshot.balanceStatus,
      currency: snapshot.balanceCurrency,
      totalCurrent: snapshot.balanceTotalCurrent,
      totalAvailable: snapshot.balanceTotalAvailable,
      updatedAt: snapshot.projectionUpdatedAt,
      accountCount: snapshot.balanceAccountCount,
    },
    transactions: {
      accepted: snapshot.transactionProcessingCount,
      pending: snapshot.transactionPendingCount,
      succeeded: snapshot.transactionSucceededCount,
      failed: snapshot.transactionFailedCount,
    },
  };
}
