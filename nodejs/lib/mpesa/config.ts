import { z } from "zod";

import type { ApplicationCredentialConfig, GatewayConfig } from "@/lib/mpesa/types";

const environmentBaseUrls = {
  sandbox: "https://sandbox.safaricom.co.ke",
  production: "https://api.safaricom.co.ke",
} as const;

const applicationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  scopes: z.array(z.string()).default([]),
  enabled: z.boolean().default(true),
  rateLimitPerMinute: z.number().int().positive().optional(),
  secret: z.string().min(1).optional(),
  secretHash: z.string().min(1).optional(),
  createdAt: z.string().optional(),
});

const envSchema = z.object({
  APP_NAME: z.string().default("Zadhron Payments Gateway"),
  APP_ENV: z.string().default("development"),
  LOG_LEVEL: z.string().default("INFO"),
  ADMIN_EMAIL: z.string().email().default("ops@zadhron.com"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be set"),
  ADMIN_SESSION_SECRET: z.string().min(32, "ADMIN_SESSION_SECRET must be set"),
  MPESA_ENVIRONMENT: z.enum(["sandbox", "production"]).default("production"),
  MPESA_BASE_URL: z.string().url().optional(),
  MPESA_CALLBACK_BASE_URL: z.string().url().optional(),
  PUBLIC_BASE_URL: z.string().url().optional(),
  MPESA_CALLBACK_ALLOWED_IPS: z.string().optional(),
  MPESA_CONSUMER_KEY: z.string().min(1, "MPESA_CONSUMER_KEY must be set"),
  MPESA_CONSUMER_SECRET: z.string().min(1, "MPESA_CONSUMER_SECRET must be set"),
  MPESA_SHORTCODE: z.string().min(1, "MPESA_SHORTCODE must be set"),
  MPESA_TILL_NUMBER: z.string().optional(),
  MPESA_TILL_NO: z.string().optional(),
  MPESA_PASSKEY: z.string().min(1, "MPESA_PASSKEY must be set"),
  MPESA_INITIATOR_NAME: z.string().optional(),
  MPESA_INITIATOR_PASSWORD: z.string().optional(),
  MPESA_SECURITY_CREDENTIAL: z.string().optional(),
  MPESA_CERTIFICATE_PATH: z.string().optional(),
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
  MPESA_PULL_TRANSACTIONS_PATH: z.string().default("/pulltransactions/v1/query"),
  MPESA_MOBILE_NUMBER_VALIDATION_PATH: z.string().default("/imsi/v2/checkATI"),
  MPESA_TRANSACTION_STATUS_PATH: z.string().default("/mpesa/transactionstatus/v1/query"),
  MPESA_REVERSAL_PATH: z.string().default("/mpesa/reversal/v1/request"),
  MPESA_ACCOUNT_BALANCE_PATH: z.string().default("/mpesa/accountbalance/v1/query"),
  MPESA_RATIBA_PATH: z.string().default("/standingorder/v1/createStandingOrderExternal"),
  GATEWAY_APPLICATIONS_JSON: z.string().optional(),
});

let cachedConfig: GatewayConfig | null = null;

function buildUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
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
  const callbackBaseUrl = env.MPESA_CALLBACK_BASE_URL ?? env.PUBLIC_BASE_URL;
  if (!callbackBaseUrl) {
    throw new Error("MPESA_CALLBACK_BASE_URL or PUBLIC_BASE_URL must be set");
  }

  const baseUrl = env.MPESA_BASE_URL ?? environmentBaseUrls[env.MPESA_ENVIRONMENT];
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
  } as const;

  cachedConfig = {
    appName: env.APP_NAME,
    appEnvironment: env.APP_ENV,
    logLevel: env.LOG_LEVEL,
    adminEmail: env.ADMIN_EMAIL,
    adminPassword: env.ADMIN_PASSWORD,
    adminSessionSecret: env.ADMIN_SESSION_SECRET,
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
    pullTransactionsPath: env.MPESA_PULL_TRANSACTIONS_PATH,
    mobileNumberValidationPath: env.MPESA_MOBILE_NUMBER_VALIDATION_PATH,
    transactionStatusPath: env.MPESA_TRANSACTION_STATUS_PATH,
    reversalPath: env.MPESA_REVERSAL_PATH,
    accountBalancePath: env.MPESA_ACCOUNT_BALANCE_PATH,
    ratibaPath: env.MPESA_RATIBA_PATH,
    callbackUrls: Object.fromEntries(
      Object.entries(callbacks).map(([key, path]) => [key, buildUrl(callbackBaseUrl, path)]),
    ),
    legacyCallbackUrls: Object.fromEntries(
      Object.entries(legacyCallbacks).map(([key, path]) => [key, buildUrl(callbackBaseUrl, path)]),
    ),
    applications: parseApplications(env.GATEWAY_APPLICATIONS_JSON),
  };

  return cachedConfig;
}

export function resetGatewayConfigForTests() {
  cachedConfig = null;
}
