import { clearAccessToken, getAccessToken } from "@/lib/mpesa/auth";
import { getGatewayConfig } from "@/lib/mpesa/config";
import {
  extractProviderCode,
  extractProviderMessage,
  MpesaIndeterminateError,
  MpesaRequestError,
} from "@/lib/mpesa/errors";
import type { ProviderHttpResult } from "@/lib/mpesa/types";

function buildMpesaUrl(path: string) {
  const config = getGatewayConfig();
  return `${config.mpesaBaseUrl.replace(/\/$/, "")}${path}`;
}

async function parseJsonResponse(response: Response) {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new MpesaRequestError("M-Pesa returned invalid JSON", 502, {
      httpStatus: response.status,
    });
  }
}

async function sendAuthorizedRequest(
  path: string,
  payload: Record<string, unknown>,
  retryOn401: boolean,
): Promise<ProviderHttpResult> {
  const config = getGatewayConfig();
  const url = buildMpesaUrl(path);
  const accessToken = await getAccessToken();

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.connectTimeoutMs + config.readTimeoutMs),
    });
  } catch (error) {
    throw new MpesaIndeterminateError(
      error instanceof Error ? error.message : "Unable to reach M-Pesa",
    );
  }

  const data = await parseJsonResponse(response);
  if (response.status === 401 && retryOn401) {
    clearAccessToken();
    return sendAuthorizedRequest(path, payload, false);
  }

  if (!response.ok) {
    throw new MpesaRequestError("M-Pesa request failed", response.status >= 500 ? 502 : 500, {
      httpStatus: response.status,
      providerCode: extractProviderCode(data),
      providerMessage: extractProviderMessage(data),
      payload: data,
      path,
    });
  }

  return { status: response.status, data };
}

export async function postToMpesa(path: string, payload: Record<string, unknown>) {
  return sendAuthorizedRequest(path, payload, true);
}
