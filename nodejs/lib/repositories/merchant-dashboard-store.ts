import { createSupabaseServerClient } from "@/lib/supabase/server";
import { mapTransactionRow, type TransactionRow } from "@/lib/repositories/transaction-records";
import type { TransactionRecord } from "@/types/gateway";

type MerchantAccountRow = {
  id: string;
  business_name: string;
  business_email: string | null;
  business_phone: string | null;
  default_currency: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type ApiKeyRow = {
  id: string;
  name: string;
  environment: string;
  key_prefix: string;
  scopes: string[] | null;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type WebhookRow = {
  id: string;
  url: string;
  environment: string;
  subscribed_events: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MerchantAccountSnapshot = {
  id: string;
  businessName: string;
  businessEmail?: string;
  businessPhone?: string;
  defaultCurrency: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type MerchantApiKeySnapshot = {
  id: string;
  name: string;
  environment: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
};

export type MerchantWebhookSnapshot = {
  id: string;
  url: string;
  environment: string;
  subscribedEvents: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MerchantDashboardMetrics = {
  totalTransactions: number;
  pendingTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalCollectionsValue: number;
  totalPayoutsValue: number;
  netFlowValue: number;
  successRate: number;
  activeApiKeyCount: number;
  activeWebhookCount: number;
  recentWindowSize: number;
  latestTransactionAt?: string;
};

export type MerchantDashboardSnapshot = {
  merchant: MerchantAccountSnapshot | null;
  apiKeys: MerchantApiKeySnapshot[];
  webhooks: MerchantWebhookSnapshot[];
  transactions: TransactionRecord[];
  metrics: MerchantDashboardMetrics;
};

function readOptionalString(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function mapMerchant(row: MerchantAccountRow): MerchantAccountSnapshot {
  return {
    id: row.id,
    businessName: row.business_name,
    businessEmail: readOptionalString(row.business_email),
    businessPhone: readOptionalString(row.business_phone),
    defaultCurrency: row.default_currency,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapApiKey(row: ApiKeyRow): MerchantApiKeySnapshot {
  return {
    id: row.id,
    name: row.name,
    environment: row.environment,
    keyPrefix: row.key_prefix,
    scopes: row.scopes ?? [],
    lastUsedAt: readOptionalString(row.last_used_at),
    expiresAt: readOptionalString(row.expires_at),
    revokedAt: readOptionalString(row.revoked_at),
    createdAt: row.created_at,
  };
}

function mapWebhook(row: WebhookRow): MerchantWebhookSnapshot {
  return {
    id: row.id,
    url: row.url,
    environment: row.environment,
    subscribedEvents: row.subscribed_events ?? [],
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isCollectionOperation(operation: TransactionRecord["operation"]) {
  return ["stkPush", "c2bRegister", "c2bSimulate", "pullTransactions"].includes(operation);
}

function isPayoutOperation(operation: TransactionRecord["operation"]) {
  return ["b2c", "b2b", "businessToPochi", "reversal"].includes(operation);
}

function summarizeTransactions(transactions: TransactionRecord[]): MerchantDashboardMetrics {
  const pendingTransactions = transactions.filter((transaction) =>
    ["accepted", "pending"].includes(transaction.status),
  ).length;
  const successfulTransactions = transactions.filter((transaction) => transaction.status === "succeeded").length;
  const failedTransactions = transactions.filter((transaction) =>
    ["failed", "cancelled", "timeout"].includes(transaction.status),
  ).length;

  const totalCollectionsValue = transactions.reduce((sum, transaction) => {
    if (transaction.status !== "succeeded" || !isCollectionOperation(transaction.operation)) {
      return sum;
    }

    return sum + (transaction.amount ?? 0);
  }, 0);

  const totalPayoutsValue = transactions.reduce((sum, transaction) => {
    if (transaction.status !== "succeeded" || !isPayoutOperation(transaction.operation)) {
      return sum;
    }

    return sum + (transaction.amount ?? 0);
  }, 0);

  const terminalTransactions = transactions.filter((transaction) =>
    ["succeeded", "failed", "cancelled", "timeout"].includes(transaction.status),
  ).length;

  return {
    totalTransactions: transactions.length,
    pendingTransactions,
    successfulTransactions,
    failedTransactions,
    totalCollectionsValue,
    totalPayoutsValue,
    netFlowValue: totalCollectionsValue - totalPayoutsValue,
    successRate: terminalTransactions ? (successfulTransactions / terminalTransactions) * 100 : 0,
    activeApiKeyCount: 0,
    activeWebhookCount: 0,
    recentWindowSize: transactions.length,
    latestTransactionAt: transactions[0]?.updatedAt ?? transactions[0]?.createdAt,
  };
}

export async function getMerchantDashboardSnapshot(
  options?: { transactionLimit?: number },
): Promise<MerchantDashboardSnapshot> {
  const supabase = await createSupabaseServerClient();
  const transactionLimit = Math.max(1, Math.min(options?.transactionLimit ?? 50, 200));

  const { data: merchantRow, error: merchantError } = await supabase
    .from("merchant_accounts")
    .select("id, business_name, business_email, business_phone, default_currency, status, created_at, updated_at")
    .maybeSingle<MerchantAccountRow>();

  if (merchantError) {
    throw new Error(`Unable to load merchant account: ${merchantError.message}`);
  }

  if (!merchantRow) {
    return {
      merchant: null,
      apiKeys: [],
      webhooks: [],
      transactions: [],
      metrics: {
        totalTransactions: 0,
        pendingTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalCollectionsValue: 0,
        totalPayoutsValue: 0,
        netFlowValue: 0,
        successRate: 0,
        activeApiKeyCount: 0,
        activeWebhookCount: 0,
        recentWindowSize: 0,
      },
    };
  }

  const merchant = mapMerchant(merchantRow);

  const [transactionsResult, apiKeysResult, webhooksResult, totalCountResult, pendingCountResult] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        [
          "id",
          "provider",
          "provider_operation",
          "status",
          "amount",
          "customer_msisdn",
          "account_reference",
          "external_reference",
          "provider_request_id",
          "provider_transaction_id",
          "idempotency_key",
          "created_at",
          "updated_at",
          "processing_started_at",
          "completed_at",
          "provider_metadata",
        ].join(", "),
      )
      .eq("merchant_account_id", merchant.id)
      .eq("provider", "mpesa")
      .order("created_at", { ascending: false })
      .limit(transactionLimit)
      .returns<TransactionRow[]>(),
    supabase
      .from("api_keys")
      .select("id, name, environment, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at")
      .eq("merchant_account_id", merchant.id)
      .order("created_at", { ascending: false })
      .returns<ApiKeyRow[]>(),
    supabase
      .from("webhooks")
      .select("id, url, environment, subscribed_events, is_active, created_at, updated_at")
      .eq("merchant_account_id", merchant.id)
      .order("created_at", { ascending: false })
      .returns<WebhookRow[]>(),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("merchant_account_id", merchant.id)
      .eq("provider", "mpesa"),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("merchant_account_id", merchant.id)
      .eq("provider", "mpesa")
      .in("status", ["pending", "processing"]),
  ]);

  if (transactionsResult.error) {
    throw new Error(`Unable to load merchant transactions: ${transactionsResult.error.message}`);
  }
  if (apiKeysResult.error) {
    throw new Error(`Unable to load merchant API keys: ${apiKeysResult.error.message}`);
  }
  if (webhooksResult.error) {
    throw new Error(`Unable to load merchant webhooks: ${webhooksResult.error.message}`);
  }
  if (totalCountResult.error) {
    throw new Error(`Unable to count merchant transactions: ${totalCountResult.error.message}`);
  }
  if (pendingCountResult.error) {
    throw new Error(`Unable to count pending merchant transactions: ${pendingCountResult.error.message}`);
  }

  const transactions = (transactionsResult.data ?? []).map(mapTransactionRow);
  const apiKeys = (apiKeysResult.data ?? []).map(mapApiKey);
  const webhooks = (webhooksResult.data ?? []).map(mapWebhook);
  const metrics = summarizeTransactions(transactions);

  metrics.totalTransactions = totalCountResult.count ?? metrics.totalTransactions;
  metrics.pendingTransactions = pendingCountResult.count ?? metrics.pendingTransactions;
  metrics.activeApiKeyCount = apiKeys.filter((key) => !key.revokedAt).length;
  metrics.activeWebhookCount = webhooks.filter((webhook) => webhook.isActive).length;

  return {
    merchant,
    apiKeys,
    webhooks,
    transactions,
    metrics,
  };
}
