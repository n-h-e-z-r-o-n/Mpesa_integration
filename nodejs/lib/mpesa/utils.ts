import { createHash, randomUUID } from "node:crypto";

import { getGatewayConfig } from "@/lib/mpesa/config";
import { GatewayValidationError } from "@/lib/mpesa/errors";

export function normalizePhone(phoneNumber: string) {
  const cleaned = phoneNumber.replace(/\D/g, "");
  let normalized = cleaned;

  if (normalized.startsWith("0")) {
    normalized = `254${normalized.slice(1)}`;
  } else if (normalized.startsWith("7") || normalized.startsWith("1")) {
    normalized = `254${normalized}`;
  }

  if (!/^254(?:7|1)\d{8}$/.test(normalized)) {
    throw new GatewayValidationError("Invalid Kenyan mobile number");
  }

  return normalized;
}

export function nairobiTimestamp(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
}

export function buildStkPassword(timestamp: string) {
  const config = getGatewayConfig();
  return Buffer.from(`${config.shortcode}${config.passkey}${timestamp}`, "utf8").toString("base64");
}

export function sanitizeAlphaNumeric(value: string, maxLength: number) {
  return value.replace(/[^a-zA-Z0-9]/g, "").slice(0, maxLength);
}

export function ensureC2BCallbackUrlAllowed(url: string) {
  if (/mpesa/i.test(url)) {
    throw new GatewayValidationError(
      "Safaricom rejects C2B callback URLs containing the word mpesa",
      { url },
    );
  }
}

export function createRequestId() {
  return `zadhron_${randomUUID()}`;
}

export function redactPhone(value?: string) {
  if (!value) {
    return value;
  }

  return value.length > 4 ? `${value.slice(0, 4)}******${value.slice(-2)}` : "******";
}

export function maskIdentifier(value?: string) {
  if (!value) {
    return value;
  }

  if (value.length <= 8) {
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }

  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

export function toSha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
