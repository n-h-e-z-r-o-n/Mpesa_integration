import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

const baseEnv = {
  APP_NAME: "Zadhron Payments Gateway",
  APP_ENV: "test",
  LOG_LEVEL: "INFO",
  ADMIN_EMAIL: "ops@zadhron.com",
  ADMIN_PASSWORD: "super-secret-password",
  ADMIN_SESSION_SECRET: "12345678901234567890123456789012",
  MPESA_ENVIRONMENT: "sandbox",
  MPESA_CALLBACK_BASE_URL: "https://payments.zadhron.com",
  MPESA_CONSUMER_KEY: "consumer-key",
  MPESA_CONSUMER_SECRET: "consumer-secret",
  MPESA_SHORTCODE: "174379",
  MPESA_TILL_NUMBER: "600000",
  MPESA_PASSKEY: "passkey",
  MPESA_INITIATOR_NAME: "testapi",
  MPESA_SECURITY_CREDENTIAL: "credential",
  HTTP_CONNECT_TIMEOUT: "5",
  HTTP_READ_TIMEOUT: "30",
  GATEWAY_APPLICATIONS_JSON: "[]",
} satisfies Record<string, string>;

describe("M-Pesa gateway", () => {
  beforeEach(async () => {
    vi.resetModules();
    Object.assign(process.env, baseEnv);
    const { resetGatewayConfigForTests } = await import("@/lib/mpesa/config");
    const { clearAccessToken } = await import("@/lib/mpesa/auth");
    const { resetRuntimeStoreForTests } = await import("@/lib/repositories/runtime-store");
    resetGatewayConfigForTests();
    clearAccessToken();
    resetRuntimeStoreForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("caches OAuth tokens until expiry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ access_token: "cached-token", expires_in: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { getAccessToken } = await import("@/lib/mpesa/auth");
    const first = await getAccessToken();
    const second = await getAccessToken();

    expect(first).toBe("cached-token");
    expect(second).toBe("cached-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("builds STK payloads from the Python-compatible rules", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-1", expires_in: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ResponseCode: "0",
            ResponseDescription: "Success. Request accepted for processing",
            MerchantRequestID: "mid-1",
            CheckoutRequestID: "ws_CO_1",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { executeMpesaOperation } = await import("@/services/mpesa/service");
    const result = await executeMpesaOperation(
      "stkPush",
      {
        phoneNumber: "0714 415 034",
        amount: 10,
        accountReference: "INV-1001$",
        transactionDesc: "Test payment!!",
        transactionType: "CustomerBuyGoodsOnline",
      },
      {
        requestId: "req-1",
        applicationId: "admin-console",
        route: "/api/admin/mpesa/operations/stkPush",
        method: "POST",
        startedAt: Date.now(),
      },
    );

    const postCall = fetchMock.mock.calls[1];
    const init = postCall?.[1] as RequestInit;
    const payload = JSON.parse(String(init.body)) as Record<string, string | number>;

    expect(payload.PartyB).toBe("600000");
    expect(payload.PhoneNumber).toBe("254714415034");
    expect(payload.AccountReference).toBe("INV1001");
    expect(payload.TransactionDesc).toBe("Testpayment");
    expect(result.success).toBe(true);
    expect(result.status).toBe("pending");
  });

  test("supports idempotent replay and conflict detection", async () => {
    const { beginIdempotentOperation, completeIdempotentOperation } = await import(
      "@/lib/gateway/idempotency"
    );

    const first = beginIdempotentOperation("idem-1", "b2c", "fingerprint-1");
    expect(first.replayed).toBe(false);

    completeIdempotentOperation("idem-1", "b2c", "fingerprint-1", {
      success: true,
      provider: "mpesa",
      operation: "b2c",
      requestId: "req-1",
      timestamp: new Date().toISOString(),
      status: "accepted",
      httpStatus: 200,
      data: { ok: true },
    });

    const replay = beginIdempotentOperation("idem-1", "b2c", "fingerprint-1");
    expect(replay.replayed).toBe(true);
    expect(replay.response?.data).toEqual({ ok: true });

    expect(() => beginIdempotentOperation("idem-1", "b2c", "different")).toThrow(
      /Idempotency key reuse/,
    );
  });

  test("generates security credentials from the Safaricom certificate", async () => {
    const { generateSecurityCredential } = await import("@/lib/mpesa/credential");
    const credential = generateSecurityCredential(
      "initiator-password",
      "C:/Users/user/Desktop/Kotlin Apps/Mpesa_integration/python/M-Pesa API Certificates/ProductionCertificate.cer",
    );

    expect(credential).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(credential).not.toContain("initiator-password");
  });

  test("normalizes provider errors for client responses", async () => {
    const { MpesaRequestError } = await import("@/lib/mpesa/errors");
    const { normalizeError } = await import("@/services/mpesa/service");

    const normalized = normalizeError(
      new MpesaRequestError("M-Pesa request failed", 502, {
        httpStatus: 401,
        providerCode: "401.002.01",
        providerMessage: "Invalid Access Token",
      }),
      "b2c",
      {
        requestId: "req-2",
        applicationId: "creditpact",
        route: "/api/mpesa/b2c",
        method: "POST",
        startedAt: Date.now(),
      },
    );

    expect(normalized.success).toBe(false);
    expect(normalized.httpStatus).toBe(502);
    expect(normalized.error?.providerCode).toBe("401.002.01");
    expect(normalized.error?.providerMessage).toBe("Invalid Access Token");
  });

  test("allows path overrides for pass-through Daraja products", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-2", expires_in: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ResponseCode: "0", ResponseDescription: "OK" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { executeMpesaOperation } = await import("@/services/mpesa/service");
    await executeMpesaOperation(
      "pullTransactions",
      {
        pathOverride: "/pulltransactions/v1/register",
        payload: { ShortCode: "174379" },
      },
      {
        requestId: "req-3",
        applicationId: "admin-console",
        route: "/api/mpesa/pull-transactions",
        method: "POST",
        startedAt: Date.now(),
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://sandbox.safaricom.co.ke/pulltransactions/v1/register");
  });
});
