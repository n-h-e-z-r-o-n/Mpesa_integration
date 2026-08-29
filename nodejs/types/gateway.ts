export type GatewayProvider = "mpesa";

export type MpesaOperation =
  | "oauthToken"
  | "stkPush"
  | "stkQuery"
  | "c2bRegister"
  | "c2bSimulate"
  | "b2c"
  | "b2b"
  | "businessToPochi"
  | "dynamicQrCode"
  | "billManager"
  | "billManagerOptin"
  | "billManagerChangeOptinDetails"
  | "billManagerCreateSingleInvoice"
  | "billManagerCreateBulkInvoices"
  | "billManagerCancelSingleInvoice"
  | "billManagerCancelBulkInvoices"
  | "billManagerReconciliation"
  | "pullTransactions"
  | "pullTransactionsQuery"
  | "pullTransactionsRegister"
  | "mobileNumberValidation"
  | "transactionStatus"
  | "reversal"
  | "accountBalance"
  | "ratiba";

export type CallbackName =
  | "stk"
  | "c2bConfirmation"
  | "c2bValidation"
  | "b2cResult"
  | "b2cTimeout"
  | "b2bResult"
  | "b2bTimeout"
  | "transactionStatusResult"
  | "transactionStatusTimeout"
  | "reversalResult"
  | "reversalTimeout"
  | "accountBalanceResult"
  | "accountBalanceTimeout"
  | "ratiba"
  | "pullTransactions"
  | "billManager";

export type TransactionStatus =
  | "accepted"
  | "pending"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "timeout"
  | "unknown";

export interface NormalizedGatewayError {
  code: string;
  message: string;
  providerCode?: string | number;
  providerMessage?: string;
  details?: Record<string, unknown>;
}

export interface NormalizedGatewayResponse<TData = unknown> {
  success: boolean;
  provider: GatewayProvider;
  operation: MpesaOperation;
  requestId: string;
  timestamp: string;
  status: TransactionStatus;
  httpStatus: number;
  data?: TData;
  error?: NormalizedGatewayError;
  upstream?: {
    httpStatus?: number;
    requestId?: string;
    conversationId?: string;
    originatorConversationId?: string;
    responseCode?: string | number;
    responseDescription?: string;
  };
  meta?: {
    idempotencyKey?: string;
    replayed?: boolean;
    applicationId?: string;
    latencyMs?: number;
  };
}

export interface GatewayApplicationRecord {
  id: string;
  name: string;
  scopes: string[];
  enabled: boolean;
  rateLimitPerMinute?: number;
  createdAt?: string;
}

export interface TransactionRecord {
  id: string;
  requestId: string;
  provider: GatewayProvider;
  operation: MpesaOperation;
  applicationId: string;
  status: TransactionStatus;
  amount?: number;
  partyA?: string;
  partyB?: string;
  accountReference?: string;
  transactionId?: string;
  providerRequestId?: string;
  providerConversationId?: string;
  providerOriginatorConversationId?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
  requestPayload: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  callbackPayloads: Array<Record<string, unknown>>;
}

export interface RequestLogRecord {
  id: string;
  requestId: string;
  applicationId: string;
  provider: GatewayProvider;
  operation: MpesaOperation | "callback";
  route: string;
  method: string;
  status: number;
  providerStatus?: string;
  providerRequestId?: string;
  providerConversationId?: string;
  latencyMs: number;
  timestamp: string;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
  error?: Record<string, unknown>;
}

export interface CallbackRecord {
  id: string;
  requestId: string;
  callbackName: CallbackName;
  provider: GatewayProvider;
  receivedAt: string;
  sourceIp?: string;
  processingStatus: "accepted" | "rejected";
  payload: Record<string, unknown>;
}

export interface AuditLogRecord {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

export interface IdempotencyRecord {
  key: string;
  operation: MpesaOperation;
  fingerprint: string;
  createdAt: string;
  response?: NormalizedGatewayResponse<Record<string, unknown>>;
  state: "processing" | "completed";
}

export interface GatewayOverview {
  environment: string;
  providerHealth: "healthy" | "degraded" | "down";
  oauthHealthy: boolean;
  callbackCount: number;
  requestCount: number;
  recentFailures: number;
  transactions: {
    accepted: number;
    pending: number;
    succeeded: number;
    failed: number;
  };
}
