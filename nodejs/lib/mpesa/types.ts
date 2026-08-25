import type { GatewayApplicationRecord, MpesaOperation } from "@/types/gateway";

export interface ApplicationCredentialConfig extends GatewayApplicationRecord {
  secret?: string;
  secretHash?: string;
}

export interface GatewayConfig {
  appName: string;
  appEnvironment: string;
  logLevel: string;
  adminEmail: string;
  adminPassword: string;
  adminSessionSecret: string;
  mpesaEnvironment: "sandbox" | "production";
  mpesaBaseUrl: string;
  callbackBaseUrl: string;
  callbackAllowedIps: string[];
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  tillNumber?: string;
  passkey: string;
  initiatorName?: string;
  initiatorPassword?: string;
  securityCredential?: string;
  certificatePath?: string;
  connectTimeoutMs: number;
  readTimeoutMs: number;
  authPath: string;
  stkPushPath: string;
  stkQueryPath: string;
  c2bRegisterPath: string;
  c2bSimulatePath: string;
  b2cPath: string;
  businessToPochiPath: string;
  b2bPath: string;
  transactionStatusPath: string;
  reversalPath: string;
  accountBalancePath: string;
  ratibaPath: string;
  callbackUrls: Record<string, string>;
  legacyCallbackUrls: Record<string, string>;
  applications: ApplicationCredentialConfig[];
}

export interface GatewayRequestContext {
  requestId: string;
  applicationId: string;
  route: string;
  method: string;
  startedAt: number;
  idempotencyKey?: string;
  adminUser?: string;
}

export interface ProviderHttpResult<T = Record<string, unknown>> {
  status: number;
  data: T;
}

export interface OperationExecutionOptions<TInput> {
  operation: MpesaOperation;
  input: TInput;
  context: GatewayRequestContext;
}
