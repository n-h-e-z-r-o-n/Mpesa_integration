import { createHash, timingSafeEqual } from "node:crypto";

import type { NextRequest } from "next/server";

import { getGatewayConfig } from "@/lib/mpesa/config";
import {
  GatewayAuthenticationError,
  GatewayAuthorizationError,
  GatewayRateLimitError,
} from "@/lib/mpesa/errors";
import { getRateLimitRecord, setRateLimitRecord } from "@/lib/repositories/runtime-store";
import type { ApplicationCredentialConfig } from "@/lib/mpesa/types";
import type { MpesaOperation } from "@/types/gateway";

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

export function authenticateApplication(request: NextRequest, operation: MpesaOperation) {
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
  return application;
}
