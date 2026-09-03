import { createHash, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

import { findMerchantApiKeyByToken } from "@/lib/repositories/merchant-access-store";
import { getGatewayConfig } from "@/lib/mpesa/config";
import {
  GatewayAuthenticationError,
  GatewayAuthorizationError,
  GatewayRateLimitError,
} from "@/lib/mpesa/errors";
import { getRateLimitRecord, setRateLimitRecord } from "@/lib/repositories/runtime-store";
import type { ApplicationCredentialConfig } from "@/lib/mpesa/types";
import type { MpesaOperation } from "@/types/gateway";

export type AuthenticatedGatewayApplication = {
  apiKeyId?: string;
  createdAt?: string;
  enabled: boolean;
  id: string;
  merchantId?: string;
  name: string;
  scopes: string[];
  source: "application" | "api_key";
};

function timingSafeMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function ensureRateLimit(application: ApplicationCredentialConfig) {
  if (!application.rateLimitPerMinute) {
    return;
  }

  const key = `${application.id}:${new Date().toISOString().slice(0, 16)}`;
  const current = getRateLimitRecord(key);
  if (!current) {
    setRateLimitRecord(key, { count: 1, windowStartedAt: Date.now() });
    return;
  }

  if (current.count >= application.rateLimitPerMinute) {
    throw new GatewayRateLimitError("Application rate limit exceeded", {
      applicationId: application.id,
      limit: application.rateLimitPerMinute,
    });
  }

  setRateLimitRecord(key, { ...current, count: current.count + 1 });
}

function hasScope(application: ApplicationCredentialConfig, operation: MpesaOperation) {
  return application.scopes.includes("*") || application.scopes.includes(operation);
}

function hasGrantedScope(scopes: string[], operation: MpesaOperation) {
  return scopes.includes("*") || scopes.includes(operation);
}

function looksLikeMerchantAccessToken(value?: string | null) {
  return typeof value === "string" && /^(zd_live_|zd_sandbox_)/.test(value.trim());
}

function readMerchantAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization && /^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, "").trim();
  }

  const directApiKey = request.headers.get("x-zadhron-api-key")?.trim();
  if (directApiKey) {
    return directApiKey;
  }

  const appSecret = request.headers.get("x-zadhron-app-secret")?.trim();
  if (looksLikeMerchantAccessToken(appSecret)) {
    return appSecret;
  }

  return "";
}

function authenticateConfiguredApplication(
  request: NextRequest,
  operation: MpesaOperation,
): AuthenticatedGatewayApplication {
  const config = getGatewayConfig();
  const appId = request.headers.get("x-zadhron-app-id");
  const appSecret = request.headers.get("x-zadhron-app-secret");

  if (!appId || !appSecret) {
    throw new GatewayAuthenticationError("Missing application credentials");
  }

  const application = config.applications.find((item) => item.id === appId);
  if (!application || !application.enabled) {
    throw new GatewayAuthenticationError("Unknown or disabled application");
  }

  const secretMatches =
    (application.secret && timingSafeMatch(application.secret, appSecret)) ||
    (application.secretHash && timingSafeMatch(application.secretHash, hashSecret(appSecret)));

  if (!secretMatches) {
    throw new GatewayAuthenticationError("Invalid application credentials");
  }

  if (!hasScope(application, operation)) {
    throw new GatewayAuthorizationError("Application does not have permission for this operation", {
      applicationId: application.id,
      operation,
    });
  }

  ensureRateLimit(application);
  return {
    id: application.id,
    merchantId: application.merchantId,
    name: application.name,
    scopes: application.scopes,
    enabled: application.enabled,
    createdAt: application.createdAt,
    source: "application",
  };
}

async function authenticateMerchantApiKey(
  request: NextRequest,
  operation: MpesaOperation,
): Promise<AuthenticatedGatewayApplication | null> {
  const token = readMerchantAccessToken(request);
  if (!token) {
    return null;
  }

  const apiKey = await findMerchantApiKeyByToken(token);
  if (!apiKey) {
    throw new GatewayAuthenticationError("Invalid access token");
  }

  if (!hasGrantedScope(apiKey.scopes, operation)) {
    throw new GatewayAuthorizationError("Access token does not have permission for this operation", {
      apiKeyId: apiKey.id,
      operation,
    });
  }

  return {
    id: apiKey.id,
    apiKeyId: apiKey.id,
    merchantId: apiKey.merchantId,
    name: apiKey.name,
    scopes: apiKey.scopes,
    enabled: true,
    createdAt: apiKey.createdAt,
    source: "api_key",
  };
}

export async function authenticateApplication(request: NextRequest, operation: MpesaOperation) {
  const merchantApiKey = await authenticateMerchantApiKey(request, operation);
  if (merchantApiKey) {
    return merchantApiKey;
  }

  return authenticateConfiguredApplication(request, operation);
}
