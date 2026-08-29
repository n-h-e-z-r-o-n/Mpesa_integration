import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

import { getGatewayConfig } from "@/lib/mpesa/config";
import { MpesaAuthenticationError } from "@/lib/mpesa/errors";

type TokenState = {
  accessToken?: string;
  expiresAt?: number;
  cacheKey?: string;
  inFlight?: Promise<string>;
};

const globalState = globalThis as typeof globalThis & {
  __zadhronMpesaTokenState?: TokenState;
};

function getTokenState() {
  if (!globalState.__zadhronMpesaTokenState) {
    globalState.__zadhronMpesaTokenState = {};
  }

  return globalState.__zadhronMpesaTokenState;
}

export function clearAccessToken() {
  const state = getTokenState();
  state.accessToken = undefined;
  state.expiresAt = undefined;
  state.cacheKey = undefined;
  state.inFlight = undefined;
}

function buildTokenCacheKey() {
  const config = getGatewayConfig();
  return createHash("sha256")
    .update(
      JSON.stringify({
        authPath: config.authPath,
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        mpesaBaseUrl: config.mpesaBaseUrl,
      }),
    )
    .digest("hex");
}

async function fetchAccessToken() {
  const config = getGatewayConfig();
  const cacheKey = buildTokenCacheKey();
  const url = `${config.mpesaBaseUrl.replace(/\/$/, "")}${config.authPath}`;
  const credentials = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`, "utf8").toString(
    "base64",
  );

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Basic ${credentials}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(config.connectTimeoutMs + config.readTimeoutMs),
    });
  } catch (error) {
    throw new MpesaAuthenticationError("Unable to contact M-Pesa OAuth endpoint", 503, {
      cause: error instanceof Error ? error.message : "unknown",
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new MpesaAuthenticationError("M-Pesa OAuth returned invalid JSON", 502);
  }

  if (!response.ok) {
    throw new MpesaAuthenticationError("M-Pesa authentication failed", 502, {
      httpStatus: response.status,
      payload,
    });
  }

  const accessToken = payload.access_token;
  if (typeof accessToken !== "string" || !accessToken) {
    throw new MpesaAuthenticationError("M-Pesa response did not include access_token", 502, {
      payload,
    });
  }

  const expiresInRaw = payload.expires_in;
  const expiresIn =
    typeof expiresInRaw === "string" || typeof expiresInRaw === "number"
      ? Number(expiresInRaw)
      : 3599;

  const state = getTokenState();
  state.accessToken = accessToken;
  state.expiresAt = Date.now() + Math.max(0, expiresIn - 60) * 1000;
  state.cacheKey = cacheKey;
  return accessToken;
}

export async function getAccessToken() {
  const state = getTokenState();
  const cacheKey = buildTokenCacheKey();
  if (state.cacheKey && state.cacheKey !== cacheKey) {
    clearAccessToken();
  }

  if (state.accessToken && state.expiresAt && Date.now() < state.expiresAt) {
    return state.accessToken;
  }

  if (!state.inFlight) {
    state.inFlight = fetchAccessToken().finally(() => {
      getTokenState().inFlight = undefined;
    });
  }

  return state.inFlight;
}

export function getCachedTokenState() {
  const state = getTokenState();
  return {
    hasToken: Boolean(state.accessToken),
    expiresAt: state.expiresAt,
  };
}
