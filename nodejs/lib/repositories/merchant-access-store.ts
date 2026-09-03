import { createCipheriv, createHash, randomBytes } from "node:crypto";

import type {
  MerchantApiKeySnapshot,
  MerchantWebhookSnapshot,
} from "@/lib/repositories/merchant-dashboard-store";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const defaultWebhookEvents = [
  "transaction.succeeded",
  "transaction.failed",
  "transaction.cancelled",
  "transaction.reversed",
] as const;

type MerchantContextRow = {
  id: string;
};

type ApiKeyInsertRow = {
  id: string;
  name: string;
  environment: "sandbox" | "live";
  key_prefix: string;
  scopes: string[] | null;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

type WebhookInsertRow = {
  id: string;
  url: string;
  environment: "sandbox" | "live";
  subscribed_events: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type ApiKeyLookupRow = {
  id: string;
  merchant_account_id: string;
  name: string;
  environment: "sandbox" | "live";
  key_prefix: string;
  scopes: string[] | null;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
};

export type MerchantApiKeyAccessRecord = {
  id: string;
  merchantId: string;
  name: string;
  environment: "sandbox" | "live";
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
};

export type CreateMerchantApiKeyInput = {
  environment?: "sandbox" | "live";
  name: string;
  scopes?: string[];
};

export type CreateMerchantWebhookInput = {
  environment?: "sandbox" | "live";
  subscribedEvents?: string[];
  url: string;
};

export type CreatedMerchantApiKey = {
  apiKey: MerchantApiKeySnapshot;
  plaintextToken: string;
};

export type CreatedMerchantWebhook = {
  signingSecret: string;
  webhook: MerchantWebhookSnapshot;
};

function readOptionalString(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function mapApiKey(row: ApiKeyInsertRow): MerchantApiKeySnapshot {
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

function mapWebhook(row: WebhookInsertRow): MerchantWebhookSnapshot {
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

function ensureAdminClient() {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    throw new Error("Supabase admin access is not configured.");
  }

  return supabase;
}

function normalizeEnvironment(value?: string) {
  return value === "sandbox" ? "sandbox" : "live";
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function generateOpaqueToken(prefix: string) {
  const suffix = randomBytes(24).toString("base64url");
  return `${prefix}${suffix}`;
}

function createEncryptionKey() {
  const rawKey =
    process.env.MERCHANT_SECRET_ENCRYPTION_KEY ??
    process.env.WEBHOOK_SECRET_ENCRYPTION_KEY ??
    process.env.ADMIN_SESSION_SECRET;

  if (!rawKey || !rawKey.trim()) {
    throw new Error(
      "MERCHANT_SECRET_ENCRYPTION_KEY, WEBHOOK_SECRET_ENCRYPTION_KEY, or ADMIN_SESSION_SECRET must be configured.",
    );
  }

  return createHash("sha256").update(rawKey).digest();
}

function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", createEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v1:${iv.toString("base64url")}:${authTag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

function normalizeScopes(scopes?: string[]) {
  const cleaned = (scopes ?? [])
    .map((scope) => scope.trim())
    .filter(Boolean);

  return cleaned.length ? Array.from(new Set(cleaned)) : ["*"];
}

function normalizeWebhookEvents(events?: string[]) {
  const cleaned = (events ?? [])
    .map((eventName) => eventName.trim())
    .filter(Boolean);

  return cleaned.length ? Array.from(new Set(cleaned)) : [...defaultWebhookEvents];
}

function normalizeWebhookUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Webhook URL is required.");
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Webhook URL must be a valid absolute URL.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Webhook URL must start with http:// or https://.");
  }

  return parsed.toString();
}

async function requireCurrentMerchantAccountId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required.");
  }

  const { data, error } = await supabase
    .from("merchant_accounts")
    .select("id")
    .maybeSingle<MerchantContextRow>();

  if (error) {
    throw new Error(`Unable to load merchant account: ${error.message}`);
  }

  if (!data) {
    throw new Error("Merchant account not found.");
  }

  return data.id;
}

export async function createMerchantApiKey(
  input: CreateMerchantApiKeyInput,
): Promise<CreatedMerchantApiKey> {
  const merchantAccountId = await requireCurrentMerchantAccountId();
  const supabase = ensureAdminClient();
  const name = input.name.trim();

  if (!name) {
    throw new Error("API key name is required.");
  }

  const environment = normalizeEnvironment(input.environment);
  const plaintextToken = generateOpaqueToken(environment === "sandbox" ? "zd_sandbox_" : "zd_live_");
  const keyPrefix = plaintextToken.slice(0, 20);
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      merchant_account_id: merchantAccountId,
      name,
      environment,
      key_prefix: keyPrefix,
      key_hash: hashValue(plaintextToken),
      scopes: normalizeScopes(input.scopes),
    })
    .select("id, name, environment, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at")
    .single<ApiKeyInsertRow>();

  if (error) {
    throw new Error(`Unable to create merchant API key: ${error.message}`);
  }

  return {
    apiKey: mapApiKey(data),
    plaintextToken,
  };
}

export async function createMerchantWebhook(
  input: CreateMerchantWebhookInput,
): Promise<CreatedMerchantWebhook> {
  const merchantAccountId = await requireCurrentMerchantAccountId();
  const supabase = ensureAdminClient();
  const signingSecret = generateOpaqueToken("whsec_");
  const { data, error } = await supabase
    .from("webhooks")
    .insert({
      merchant_account_id: merchantAccountId,
      url: normalizeWebhookUrl(input.url),
      environment: normalizeEnvironment(input.environment),
      secret_ciphertext: encryptSecret(signingSecret),
      subscribed_events: normalizeWebhookEvents(input.subscribedEvents),
      is_active: true,
    })
    .select("id, url, environment, subscribed_events, is_active, created_at, updated_at")
    .single<WebhookInsertRow>();

  if (error) {
    throw new Error(`Unable to create merchant webhook: ${error.message}`);
  }

  return {
    webhook: mapWebhook(data),
    signingSecret,
  };
}

export async function findMerchantApiKeyByToken(
  token: string,
): Promise<MerchantApiKeyAccessRecord | null> {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, merchant_account_id, name, environment, key_prefix, scopes, created_at, expires_at, revoked_at")
    .eq("key_hash", hashValue(trimmed))
    .maybeSingle<ApiKeyLookupRow>();

  if (error) {
    throw new Error(`Unable to resolve merchant API key: ${error.message}`);
  }

  if (!data || data.revoked_at) {
    return null;
  }

  if (data.expires_at && Date.parse(data.expires_at) <= Date.now()) {
    return null;
  }

  void supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);

  return {
    id: data.id,
    merchantId: data.merchant_account_id,
    name: data.name,
    environment: data.environment,
    keyPrefix: data.key_prefix,
    scopes: data.scopes ?? [],
    createdAt: data.created_at,
  };
}

export function parseWebhookEventsInput(rawValue: string) {
  return normalizeWebhookEvents(rawValue.split(/[\r\n,]+/));
}
