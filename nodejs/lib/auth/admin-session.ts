import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getGatewayConfig } from "@/lib/mpesa/config";
import { GatewayAuthenticationError } from "@/lib/mpesa/errors";

const ADMIN_COOKIE_NAME = "zadhron_admin_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

type AdminSession = {
  email: string;
  exp: number;
};

function sign(value: string) {
  const secret = getGatewayConfig().adminSessionSecret;
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function encode(payload: AdminSession) {
  const raw = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${raw}.${sign(raw)}`;
}

function decode(value: string): AdminSession | null {
  const [raw, signature] = value.split(".");
  if (!raw || !signature) {
    return null;
  }

  const expected = sign(raw);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as AdminSession;
  if (Date.now() > payload.exp) {
    return null;
  }

  return payload;
}

export function authenticateAdmin(email: string, password: string) {
  const config = getGatewayConfig();
  if (email.trim().toLowerCase() !== config.adminEmail.toLowerCase() || password !== config.adminPassword) {
    throw new GatewayAuthenticationError("Invalid administrator credentials");
  }

  return encode({
    email: config.adminEmail,
    exp: Date.now() + SESSION_TTL_MS,
  });
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return raw ? decode(raw) : null;
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) {
    redirect("/login");
  }

  return session;
}

export const adminCookie = {
  name: ADMIN_COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  },
};
