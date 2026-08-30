import { z } from "zod";

import type { ApplicationCredentialConfig, GatewayConfig } from "@/lib/mpesa/types";

const environmentBaseUrls = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
} as const;

const applicationSchema = z.object({
  id: z.string().min(1),
  merchantId: z.string().uuid().optional(),
  name: z.string().min(1),
  scopes: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  rateLimitPerMinute: z.number().int().positive().optional(),
  secret: z.string().min(1).optional(),
  secretHash: z.string().min(1).optional(),
  createdAt: z.string().optional(),
});

function blankToUndefined(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

const optionalStringEnv = z.preprocess(blankToUndefined, z.string().optional());

const envSchema = z.object({
  APP_NAME: z.string().default("Zadhron Payments Gateway"),
  APP_ENV: z.string().default("development"),
  LOG_LEVEL: z.string().default("INFO"),
  ADMIN_EMAIL: z.string().email().default("ops@zadhron.com"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be set"),
  ADMIN_SESSION_SECRET: z.string().min(32, "ADMIN_SESSION_SECRET must be set"),
  GATEWAY_DEFAULT_MERCHANT_ID: z.preprocess(blankToUndefined, z.string().uuid().optional()),
  MPESA_ENVIRONMENT: z.enum(["sandbox", "production"]).default("production"),
  MPESA_BASE_URL: optionalStringEnv,
  MPESA_CALLBACK_BASE_URL: optionalStringEnv,
  PUBLIC_BASE_URL: optionalStringEnv,
  MPESA_CALLBACK_ALLOWED_IPS: optionalStringEnv,
  MPESA_CONSUMER_KEY: z.string().min(1, "MPESA_CONSUMER_KEY must be set"),
  MPESA_CONSUMER_SECRET: z.string().min(1, "MPESA_CONSUMER_SECRET must be set"),
  MPESA_SHORTCODE: z.string().min(1, "MPESA_SHORTCODE must be set"),
  MPESA_TILL_NUMBER: optionalStringEnv,
  MPESA_TILL_NO: optionalStringEnv,
  MPESA_PASSKEY: z.string().min(1, "MPESA_PASSKEY must be set"),
  MPESA_INITIATOR_NAME: optionalStringEnv,
  MPESA_INITIATOR_PASSWORD: optionalStringEnv,
  MPESA_SECURITY_CREDENTIAL: optionalStringEnv,
  MPESA_CERTIFICATE_PATH: optionalStringEnv,
  MPESA_STK_CALLBACK_URL: optionalStringEnv,
  MPESA_C2B_CONFIRMATION_URL: optionalStringEnv,
  MPESA_C2B_VALIDATION_URL: optionalStringEnv,
  MPESA_B2C_RESULT_URL: optionalStringEnv,
  MPESA_B2C_TIMEOUT_URL: optionalStringEnv,
  MPESA_B2B_RESULT_URL: optionalStringEnv,
  MPESA_B2B_TIMEOUT_URL: optionalStringEnv,
  MPESA_TRANSACTION_STATUS_RESULT_URL: optionalStringEnv,
  MPESA_TRANSACTION_STATUS_TIMEOUT_URL: optionalStringEnv,
  MPESA_REVERSAL_RESULT_URL: optionalStringEnv,
  MPESA_REVERSAL_TIMEOUT_URL: optionalStringEnv,
  MPESA_ACCOUNT_BALANCE_RESULT_URL: optionalStringEnv,
  MPESA_ACCOUNT_BALANCE_TIMEOUT_URL: optionalStringEnv,
  MPESA_RATIBA_CALLBACK_URL: optionalStringEnv,
  HTTP_CONNECT_TIMEOUT: z.coerce.number().positive().default(5),
  HTTP_READ_TIMEOUT: z.coerce.number().positive().default(30),
  MPESA_AUTH_PATH: z.string().default("/oauth/v1/generate?grant_type=client_credentials"),
  MPESA_STK_PUSH_PATH: z.string().default("/mpesa/stkpush/v1/processrequest"),
  MPESA_STK_QUERY_PATH: z.string().default("/mpesa/stkpushquery/v1/query"),
  MPESA_C2B_REGISTER_PATH: z.string().default("/mpesa/c2b/v2/registerurl"),
  MPESA_C2B_SIMULATE_PATH: z.string().default("/mpesa/c2b/v2/simulate"),
  MPESA_B2C_PATH: z.string().default("/mpesa/b2c/v3/paymentrequest"),
  MPESA_B2POCHI_PATH: z.string().default("/mpesa/b2c/v1/paymentrequest"),
  MPESA_B2B_PATH: z.string().default("/mpesa/b2b/v1/paymentrequest"),
  MPESA_DYNAMIC_QRCODE_PATH: z.string().default("/mpesa/qrcode/v1/generate"),
  MPESA_BILL_MANAGER_PATH: z.string().default("/v1/billmanager-invoice/create-single-invoice"),
  MPESA_BILL_MANAGER_OPTIN_PATH: z.string().default("/v1/billmanager-invoice/optin"),
  MPESA_BILL_MANAGER_CHANGE_OPTIN_DETAILS_PATH: z.string().default("/v1/billmanager-invoice/change-optin-details"),
  MPESA_BILL_MANAGER_CREATE_SINGLE_INVOICE_PATH: optionalStringEnv,
  MPESA_BILL_MANAGER_CREATE_BULK_INVOICES_PATH: z.string().default("/v1/billmanager-invoice/create-bulk-invoices"),
  MPESA_BILL_MANAGER_CANCEL_SINGLE_INVOICE_PATH: z.string().default("/v1/billmanager-invoice/cancel-single-invoice"),
  MPESA_BILL_MANAGER_CANCEL_BULK_INVOICES_PATH: z.string().default("/v1/billmanager-invoice/cancel-bulk-invoices"),
  MPESA_BILL_MANAGER_RECONCILIATION_PATH: z.string().default("/v1/billmanager-invoice/reconciliation"),
  MPESA_BILL_MANAGER_EMAIL: optionalStringEnv,
  MPESA_BILL_MANAGER_OFFICIAL_CONTACT: optionalStringEnv,
  MPESA_BILL_MANAGER_SEND_REMINDERS: z.coerce.number().int().default(1),
  MPESA_BILL_MANAGER_LOGO: optionalStringEnv,
  MPESA_PULL_TRANSACTIONS_PATH: z.string().default("/pulltransactions/v1/query"),
  MPESA_PULL_TRANSACTIONS_QUERY_PATH: optionalStringEnv,
  MPESA_PULL_TRANSACTIONS_REGISTER_PATH: z.string().default("/pulltransactions/v1/register"),
  MPESA_PULL_TRANSACTIONS_REQUEST_TYPE: z.string().default("Pull"),
  MPESA_PULL_TRANSACTIONS_NOMINATED_NUMBER: optionalStringEnv,
  MPESA_MOBILE_NUMBER_VALIDATION_PATH: z.string().default("/imsi/v2/checkATI"),
  MPESA_TRANSACTION_STATUS_PATH: z.string().default("/mpesa/transactionstatus/v1/query"),
  MPESA_REVERSAL_PATH: z.string().default("/mpesa/reversal/v1/request"),
  MPESA_ACCOUNT_BALANCE_PATH: z.string().default("/mpesa/accountbalance/v1/query"),
  MPESA_RATIBA_PATH: z.string().default("/standingorder/v1/createStandingOrderExternal"),
  MPESA_BILL_MANAGER_CALLBACK_URL: optionalStringEnv,
  MPESA_PULL_TRANSACTIONS_CALLBACK_URL: optionalStringEnv,
  GATEWAY_APPLICATIONS_JSON: optionalStringEnv,
});

let cachedConfig: GatewayConfig | null = null;

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function trimOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeAbsoluteUrl(value: string, envKey: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${envKey} must not be empty`);
  }

  if (trimmed.startsWith("/")) {
    throw new Error(`${envKey} must be an absolute URL or bare hostname, not a relative path`);
  }

  const withScheme =
    /^https?:\/\//i.test(trimmed)
      ? trimmed
      : /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?(?:\/.*)?$/i.test(trimmed)
        ? `http://${trimmed}`
        : `https://${trimmed}`;

  const parsed = z.string().url().safeParse(withScheme);
  if (!parsed.success) {
    throw new Error(`${envKey} must be a valid absolute URL or bare hostname`);
  }

  return parsed.data.replace(/\/$/, "");
}

function resolveOptionalCallbackUrl(
  callbackBaseUrl: string,
  value: string | undefined,
  envKey: string,
) {
  const trimmed = trimOptional(value);
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("/")) {
    return buildUrl(callbackBaseUrl, trimmed);
  }

  const parsed = z.string().url().safeParse(trimmed);
  if (!parsed.success) {
    throw new Error(`${envKey} must be an absolute URL or start with '/'`);
  }

  return parsed.data;
}

function parseApplications(raw?: string): ApplicationCredentialConfig[] {
  if (!raw || !raw.trim()) {
    return [];
  }

  const parsed = JSON.parse(raw) as unknown;
  return z.array(applicationSchema).parse(parsed);
}

export function getGatewayConfig(): GatewayConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const env = envSchema.parse(process.env);
  const callbackBaseUrlRaw = env.MPESA_CALLBACK_BASE_URL ?? env.PUBLIC_BASE_URL;
  if (!callbackBaseUrlRaw) {
    throw new Error("MPESA_CALLBACK_BASE_URL or PUBLIC_BASE_URL must be set");
  }
  const callbackBaseUrl = normalizeAbsoluteUrl(
    callbackBaseUrlRaw,
    env.MPESA_CALLBACK_BASE_URL ? "MPESA_CALLBACK_BASE_URL" : "PUBLIC_BASE_URL",
  );

  const baseUrl = env.MPESA_BASE_URL
    ? normalizeAbsoluteUrl(env.MPESA_BASE_URL, "MPESA_BASE_URL")
    : environmentBaseUrls[env.MPESA_ENVIRONMENT];
  const tillNumber = env.MPESA_TILL_NUMBER ?? env.MPESA_TILL_NO;

  const callbacks = {
    stk: "/api/mpesa/callbacks/stk",
    c2bConfirmation: "/api/mpesa/callbacks/c2b/confirmation",
    c2bValidation: "/api/mpesa/callbacks/c2b/validation",
    b2cResult: "/api/mpesa/callbacks/b2c/result",
    b2cTimeout: "/api/mpesa/callbacks/b2c/timeout",
    b2bResult: "/api/mpesa/callbacks/b2b/result",
    b2bTimeout: "/api/mpesa/callbacks/b2b/timeout",
    transactionStatusResult: "/api/mpesa/callbacks/transaction-status/result",
    transactionStatusTimeout: "/api/mpesa/callbacks/transaction-status/timeout",
    reversalResult: "/api/mpesa/callbacks/reversal/result",
    reversalTimeout: "/api/mpesa/callbacks/reversal/timeout",
    accountBalanceResult: "/api/mpesa/callbacks/account-balance/result",
    accountBalanceTimeout: "/api/mpesa/callbacks/account-balance/timeout",
    ratiba: "/api/mpesa/callbacks/ratiba",
    pullTransactions: "/api/mpesa/callbacks/pull-transactions",
    billManager: "/api/mpesa/callbacks/bill-manager",
  } as const;

  const legacyCallbacks = {
    stk: "/callbacks/payments/stk",
    c2bConfirmation: "/callbacks/payments/c2b/confirmation",
    c2bValidation: "/callbacks/payments/c2b/validation",
    b2cResult: "/callbacks/payments/b2c/result",
    b2cTimeout: "/callbacks/payments/b2c/timeout",
    b2bResult: "/callbacks/payments/b2b/result",
    b2bTimeout: "/callbacks/payments/b2b/timeout",
    transactionStatusResult: "/callbacks/payments/transaction-status/result",
    transactionStatusTimeout: "/callbacks/payments/transaction-status/timeout",
    reversalResult: "/callbacks/payments/reversal/result",
    reversalTimeout: "/callbacks/payments/reversal/timeout",
    accountBalanceResult: "/callbacks/payments/account-balance/result",
    accountBalanceTimeout: "/callbacks/payments/account-balance/timeout",
    ratiba: "/callbacks/payments/ratiba",
    pullTransactions: "/callbacks/payments/pull-transactions",
    billManager: "/callbacks/payments/bill-manager",
  } as const;

  const callbackUrls = Object.fromEntries(
    Object.entries(callbacks).map(([key, path]) => [key, buildUrl(callbackBaseUrl, path)]),
  );

  const legacyCallbackUrls = Object.fromEntries(
    Object.entries(legacyCallbacks).map(([key, path]) => [key, buildUrl(callbackBaseUrl, path)]),
  );

  const callbackOverrides = {
    stk: env.MPESA_STK_CALLBACK_URL,
    c2bConfirmation: env.MPESA_C2B_CONFIRMATION_URL,
    c2bValidation: env.MPESA_C2B_VALIDATION_URL,
    b2cResult: env.MPESA_B2C_RESULT_URL,
    b2cTimeout: env.MPESA_B2C_TIMEOUT_URL,
    b2bResult: env.MPESA_B2B_RESULT_URL,
    b2bTimeout: env.MPESA_B2B_TIMEOUT_URL,
    transactionStatusResult: env.MPESA_TRANSACTION_STATUS_RESULT_URL,
    transactionStatusTimeout: env.MPESA_TRANSACTION_STATUS_TIMEOUT_URL,
    reversalResult: env.MPESA_REVERSAL_RESULT_URL,
    reversalTimeout: env.MPESA_REVERSAL_TIMEOUT_URL,
    accountBalanceResult: env.MPESA_ACCOUNT_BALANCE_RESULT_URL,
    accountBalanceTimeout: env.MPESA_ACCOUNT_BALANCE_TIMEOUT_URL,
    ratiba: env.MPESA_RATIBA_CALLBACK_URL,
    billManager: env.MPESA_BILL_MANAGER_CALLBACK_URL,
    pullTransactions: env.MPESA_PULL_TRANSACTIONS_CALLBACK_URL,
  } as const;

  for (const [key, rawValue] of Object.entries(callbackOverrides)) {
    const override = resolveOptionalCallbackUrl(callbackBaseUrl, rawValue, `callback override ${key}`);
    if (override) {
      callbackUrls[key] = override;
      legacyCallbackUrls[key] = override;
    }
  }

  cachedConfig = {
    appName: env.APP_NAME,
    appEnvironment: env.APP_ENV,
    logLevel: env.LOG_LEVEL,
    adminEmail: env.ADMIN_EMAIL,
    adminPassword: env.ADMIN_PASSWORD,
    adminSessionSecret: env.ADMIN_SESSION_SECRET,
    defaultMerchantId: env.GATEWAY_DEFAULT_MERCHANT_ID,
    mpesaEnvironment: env.MPESA_ENVIRONMENT,
    mpesaBaseUrl: baseUrl,
    callbackBaseUrl,
    callbackAllowedIps: env.MPESA_CALLBACK_ALLOWED_IPS
      ? env.MPESA_CALLBACK_ALLOWED_IPS.split(",").map((ip) => ip.trim()).filter(Boolean)
      : [],
    consumerKey: env.MPESA_CONSUMER_KEY,
    consumerSecret: env.MPESA_CONSUMER_SECRET,
    shortcode: env.MPESA_SHORTCODE.trim(),
    tillNumber: tillNumber?.trim(),
    passkey: env.MPESA_PASSKEY,
    initiatorName: env.MPESA_INITIATOR_NAME?.trim(),
    initiatorPassword: env.MPESA_INITIATOR_PASSWORD,
    securityCredential: env.MPESA_SECURITY_CREDENTIAL,
    certificatePath: env.MPESA_CERTIFICATE_PATH,
    connectTimeoutMs: env.HTTP_CONNECT_TIMEOUT * 1000,
    readTimeoutMs: env.HTTP_READ_TIMEOUT * 1000,
    authPath: env.MPESA_AUTH_PATH,
    stkPushPath: env.MPESA_STK_PUSH_PATH,
    stkQueryPath: env.MPESA_STK_QUERY_PATH,
    c2bRegisterPath: env.MPESA_C2B_REGISTER_PATH,
    c2bSimulatePath: env.MPESA_C2B_SIMULATE_PATH,
    b2cPath: env.MPESA_B2C_PATH,
    businessToPochiPath: env.MPESA_B2POCHI_PATH,
    b2bPath: env.MPESA_B2B_PATH,
    dynamicQrCodePath: env.MPESA_DYNAMIC_QRCODE_PATH,
    billManagerPath: env.MPESA_BILL_MANAGER_PATH,
    billManagerOptinPath: env.MPESA_BILL_MANAGER_OPTIN_PATH,
    billManagerChangeOptinDetailsPath: env.MPESA_BILL_MANAGER_CHANGE_OPTIN_DETAILS_PATH,
    billManagerCreateSingleInvoicePath:
      env.MPESA_BILL_MANAGER_CREATE_SINGLE_INVOICE_PATH ?? env.MPESA_BILL_MANAGER_PATH,
    billManagerCreateBulkInvoicesPath: env.MPESA_BILL_MANAGER_CREATE_BULK_INVOICES_PATH,
    billManagerCancelSingleInvoicePath: env.MPESA_BILL_MANAGER_CANCEL_SINGLE_INVOICE_PATH,
    billManagerCancelBulkInvoicesPath: env.MPESA_BILL_MANAGER_CANCEL_BULK_INVOICES_PATH,
    billManagerReconciliationPath: env.MPESA_BILL_MANAGER_RECONCILIATION_PATH,
    pullTransactionsPath: env.MPESA_PULL_TRANSACTIONS_PATH,
    pullTransactionsQueryPath:
      env.MPESA_PULL_TRANSACTIONS_QUERY_PATH ?? env.MPESA_PULL_TRANSACTIONS_PATH,
    pullTransactionsRegisterPath: env.MPESA_PULL_TRANSACTIONS_REGISTER_PATH,
    mobileNumberValidationPath: env.MPESA_MOBILE_NUMBER_VALIDATION_PATH,
    transactionStatusPath: env.MPESA_TRANSACTION_STATUS_PATH,
    reversalPath: env.MPESA_REVERSAL_PATH,
    accountBalancePath: env.MPESA_ACCOUNT_BALANCE_PATH,
    ratibaPath: env.MPESA_RATIBA_PATH,
    billManagerEmail: trimOptional(env.MPESA_BILL_MANAGER_EMAIL),
    billManagerOfficialContact: trimOptional(env.MPESA_BILL_MANAGER_OFFICIAL_CONTACT),
    billManagerSendReminders: env.MPESA_BILL_MANAGER_SEND_REMINDERS,
    billManagerLogo: trimOptional(env.MPESA_BILL_MANAGER_LOGO),
    pullTransactionsRequestType: env.MPESA_PULL_TRANSACTIONS_REQUEST_TYPE.trim() || "Pull",
    pullTransactionsNominatedNumber: trimOptional(env.MPESA_PULL_TRANSACTIONS_NOMINATED_NUMBER),
    callbackUrls,
    legacyCallbackUrls,
    applications: parseApplications(env.GATEWAY_APPLICATIONS_JSON),
  };

  return cachedConfig;
}

export function resetGatewayConfigForTests() {
  cachedConfig = null;
}
