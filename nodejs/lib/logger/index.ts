import { randomUUID } from "node:crypto";

import { persistAuditLog } from "@/lib/repositories/telemetry-store";
import { addAuditLog } from "@/lib/repositories/runtime-store";

const redactedKeys = [
  "authorization",
  "consumersecret",
  "password",
  "secret",
  "securitycredential",
  "token",
  "initiatorpassword",
];

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      const lowerKey = key.toLowerCase();
      if (redactedKeys.some((item) => lowerKey.includes(item))) {
        return [key, "[REDACTED]"];
      }

      return [key, sanitizeValue(entry)];
    }),
  );
}

export function sanitizeForLogs<T>(value: T): T {
  return sanitizeValue(value) as T;
}

export function logEvent(
  level: "info" | "warn" | "error",
  message: string,
  data?: Record<string, unknown>,
) {
  const sanitized = data ? sanitizeForLogs(data) : undefined;
  const record = {
    id: randomUUID(),
    level,
    message,
    timestamp: new Date().toISOString(),
    data: sanitized,
  };
  addAuditLog(record);
  void persistAuditLog(record).catch((error) => {
    console.warn(
      JSON.stringify({
        level: "warn",
        message: "Unable to persist audit log",
        data: {
          originalMessage: message,
          error: error instanceof Error ? error.message : "unknown",
        },
      }),
    );
  });

  const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
  logger(JSON.stringify({ level, message, ...(sanitized ? { data: sanitized } : {}) }));
}
