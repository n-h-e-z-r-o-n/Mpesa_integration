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
  MPESA_BILL_MANAGER_EMAIL: "billing@zadhron.com",
  MPESA_BILL_MANAGER_OFFICIAL_CONTACT: "254722000000",
  MPESA_PULL_TRANSACTIONS_NOMINATED_NUMBER: "254733000000",
  SUPABASE_SERVICE_ROLE_KEY: "",
  SUPABASE_SERVICE_KEY: "",
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
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.doUnmock("@/lib/repositories/admin-dashboard-store");
    vi.doUnmock("@/lib/repositories/callback-store");
    vi.doUnmock("@/lib/repositories/telemetry-store");
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

  test("refreshes the cached OAuth token when M-Pesa config changes", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-a", expires_in: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-b", expires_in: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { getAccessToken } = await import("@/lib/mpesa/auth");
    const { resetGatewayConfigForTests } = await import("@/lib/mpesa/config");

    const first = await getAccessToken();
    process.env.MPESA_CONSUMER_KEY = "consumer-key-rotated";
    resetGatewayConfigForTests();
    const second = await getAccessToken();

    expect(first).toBe("token-a");
    expect(second).toBe("token-b");
    expect(fetchMock).toHaveBeenCalledTimes(2);
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

  test("builds Bill Manager opt-in payloads from environment defaults", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-3", expires_in: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ResponseCode: "0", ResponseDescription: "Accepted" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { executeMpesaOperation } = await import("@/services/mpesa/service");
    await executeMpesaOperation(
      "billManagerOptin",
      {},
      {
        requestId: "req-4",
        applicationId: "admin-console",
        route: "/api/mpesa/bill-manager/optin",
        method: "POST",
        startedAt: Date.now(),
      },
    );

    const init = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const payload = JSON.parse(String(init.body)) as Record<string, string | number>;

    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://sandbox.safaricom.co.ke/v1/billmanager-invoice/optin");
    expect(payload.shortcode).toBe("174379");
    expect(payload.email).toBe("billing@zadhron.com");
    expect(payload.officialContact).toBe("254722000000");
    expect(payload.callbackurl).toBe("https://payments.zadhron.com/callbacks/payments/bill-manager");
  });

  test("builds Pull Transactions registration payloads from environment defaults", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-4", expires_in: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ResponseCode: "0", ResponseDescription: "Accepted" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { executeMpesaOperation } = await import("@/services/mpesa/service");
    await executeMpesaOperation(
      "pullTransactionsRegister",
      {},
      {
        requestId: "req-5",
        applicationId: "admin-console",
        route: "/api/mpesa/pull-transactions/register",
        method: "POST",
        startedAt: Date.now(),
      },
    );

    const init = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const payload = JSON.parse(String(init.body)) as Record<string, string>;

    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://sandbox.safaricom.co.ke/pulltransactions/v1/register");
    expect(payload.ShortCode).toBe("174379");
    expect(payload.RequestType).toBe("Pull");
    expect(payload.NominatedNumber).toBe("254733000000");
    expect(payload.CallBackURL).toBe("https://payments.zadhron.com/callbacks/payments/pull-transactions");
  });

  test("treats callback payloads without ResultCode as accepted", async () => {
    const { processMpesaCallback } = await import("@/services/mpesa/service");
    const response = await processMpesaCallback(
      "billManager",
      { invoice: "INV-1001", status: "received" },
      "127.0.0.1",
    );

    const { getRequestLogs, getCallbacks } = await import("@/lib/repositories/runtime-store");

    expect(response).toEqual({ ResultCode: 0, ResultDesc: "Accepted" });
    expect(getCallbacks()[0]?.callbackName).toBe("billManager");
    expect(getRequestLogs()[0]?.providerStatus).toBe("accepted");
  });

  test("reconciles callbacks against persisted transactions when runtime memory is empty", async () => {
    const persistTransactionSnapshot = vi.fn().mockResolvedValue(undefined);

    vi.doMock("@/lib/repositories/telemetry-store", async () => {
      const actual = await vi.importActual<typeof import("@/lib/repositories/telemetry-store")>(
        "@/lib/repositories/telemetry-store",
      );

      return {
        ...actual,
        listStoredTransactions: async () => [
          {
            id: "ws_CO_persisted",
            requestId: "req-persisted",
            provider: "mpesa" as const,
            operation: "stkPush" as const,
            applicationId: "admin-console",
            status: "pending" as const,
            createdAt: "2026-08-29T18:10:00.000Z",
            updatedAt: "2026-08-29T18:10:00.000Z",
            requestPayload: { Amount: 125 },
            responsePayload: { CheckoutRequestID: "ws_CO_persisted" },
            callbackPayloads: [],
          },
        ],
        persistRequestLog: async () => undefined,
        persistTransactionSnapshot,
      };
    });

    const { processMpesaCallback } = await import("@/services/mpesa/service");

    await processMpesaCallback(
      "stk",
      {
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_persisted",
            ResultCode: 0,
            CallbackMetadata: {
              Item: [{ Key: "Amount", Value: 125 }],
            },
          },
        },
      },
      "127.0.0.1",
    );

    expect(persistTransactionSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "ws_CO_persisted",
        status: "succeeded",
      }),
    );
  });

  test("exposes latest known shortcode balance from account balance callbacks", async () => {
    vi.doMock("@/lib/repositories/admin-dashboard-store", () => ({
      getAdminDashboardSnapshot: async () => ({
        dashboardKey: "primary",
        transactionProcessingCount: 0,
        transactionPendingCount: 0,
        transactionSucceededCount: 0,
        transactionFailedCount: 0,
        callbackCount: 1,
        requestCount: 0,
        failedRequestCount: 0,
        slowRequestCount: 0,
        activeApplicationCount: 0,
        collectionsToday: 0,
        payoutsToday: 0,
        netFlowToday: 0,
        balanceStatus: "available" as const,
        balanceCurrency: "KES",
        balanceTotalCurrent: 23,
        balanceTotalAvailable: 23,
        balanceAccountCount: 2,
        latestTransactionAt: undefined,
        latestCallbackAt: "2026-08-29T15:30:00.000Z",
        latestRequestAt: undefined,
        latestBalanceCallbackAt: "2026-08-29T15:30:00.000Z",
        oldestPendingCreatedAt: undefined,
        projectionUpdatedAt: "2026-08-29T15:31:00.000Z",
        balanceAccounts: [],
      }),
    }));

    const { getGatewayOverview } = await import("@/services/mpesa/service");

    const overview = await getGatewayOverview();

    expect(overview.shortcodeBalance).toMatchObject({
      status: "available",
      currency: "KES",
      totalCurrent: 23,
      totalAvailable: 23,
      accountCount: 2,
    });
  });

  test("summarizes persisted-style treasury metrics from callbacks and pending transactions", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T16:00:00.000Z"));

    vi.doMock("@/lib/repositories/admin-dashboard-store", () => ({
      getAdminDashboardSnapshot: async () => ({
        dashboardKey: "primary",
        transactionProcessingCount: 1,
        transactionPendingCount: 1,
        transactionSucceededCount: 0,
        transactionFailedCount: 0,
        callbackCount: 2,
        requestCount: 0,
        failedRequestCount: 0,
        slowRequestCount: 0,
        activeApplicationCount: 1,
        collectionsToday: 150,
        payoutsToday: 40,
        netFlowToday: 110,
        balanceStatus: "unavailable" as const,
        balanceCurrency: undefined,
        balanceTotalCurrent: undefined,
        balanceTotalAvailable: undefined,
        balanceAccountCount: 0,
        latestTransactionAt: "2026-08-29T15:20:00.000Z",
        latestCallbackAt: "2026-08-29T15:20:00.000Z",
        latestRequestAt: undefined,
        latestBalanceCallbackAt: undefined,
        oldestPendingCreatedAt: "2026-08-29T14:00:00.000Z",
        projectionUpdatedAt: "2026-08-29T15:21:00.000Z",
        balanceAccounts: [],
      }),
    }));

    const { getGatewayOverview } = await import("@/services/mpesa/service");

    const overview = await getGatewayOverview();

    expect(overview.collectionsToday).toBe(150);
    expect(overview.payoutsToday).toBe(40);
    expect(overview.netFlowToday).toBe(110);
    expect(overview.transactions.pending).toBe(1);
    expect(overview.oldestPendingMinutes).toBe(120);
  });

  test("ignores blank optional callback URL env vars", async () => {
    process.env.MPESA_BILL_MANAGER_CALLBACK_URL = "   ";
    process.env.MPESA_PULL_TRANSACTIONS_CALLBACK_URL = "";

    const { resetGatewayConfigForTests, getGatewayConfig } = await import("@/lib/mpesa/config");
    resetGatewayConfigForTests();

    const config = getGatewayConfig();

    expect(config.callbackUrls.billManager).toBe(
      "https://payments.zadhron.com/api/mpesa/callbacks/bill-manager",
    );
    expect(config.legacyCallbackUrls.pullTransactions).toBe(
      "https://payments.zadhron.com/callbacks/payments/pull-transactions",
    );
  });

  test("normalizes root-relative callback override env vars", async () => {
    process.env.MPESA_BILL_MANAGER_CALLBACK_URL = "/callbacks/payments/bill-manager";
    process.env.MPESA_PULL_TRANSACTIONS_CALLBACK_URL = "/callbacks/payments/pull-transactions";

    const { resetGatewayConfigForTests, getGatewayConfig } = await import("@/lib/mpesa/config");
    resetGatewayConfigForTests();

    const config = getGatewayConfig();

    expect(config.callbackUrls.billManager).toBe(
      "https://payments.zadhron.com/callbacks/payments/bill-manager",
    );
    expect(config.callbackUrls.pullTransactions).toBe(
      "https://payments.zadhron.com/callbacks/payments/pull-transactions",
    );
  });

  test("normalizes bare hostname callback base URLs", async () => {
    process.env.MPESA_CALLBACK_BASE_URL = "weathered-haze-72159.pktriot.xyz";

    const { resetGatewayConfigForTests, getGatewayConfig } = await import("@/lib/mpesa/config");
    resetGatewayConfigForTests();

    const config = getGatewayConfig();

    expect(config.callbackBaseUrl).toBe("https://weathered-haze-72159.pktriot.xyz");
    expect(config.callbackUrls.stk).toBe(
      "https://weathered-haze-72159.pktriot.xyz/api/mpesa/callbacks/stk",
    );
  });

  test("uses configured C2B callback overrides instead of /api/mpesa callback paths", async () => {
    process.env.MPESA_C2B_CONFIRMATION_URL = "/callbacks/payments/c2b/confirmation";
    process.env.MPESA_C2B_VALIDATION_URL = "/callbacks/payments/c2b/validation";

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-5", expires_in: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ResponseCode: "0", ResponseDescription: "Accepted" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { resetGatewayConfigForTests } = await import("@/lib/mpesa/config");
    resetGatewayConfigForTests();

    const { executeMpesaOperation } = await import("@/services/mpesa/service");
    await executeMpesaOperation(
      "c2bRegister",
      {},
      {
        requestId: "req-6",
        applicationId: "admin-console",
        route: "/api/mpesa/c2b/register",
        method: "POST",
        startedAt: Date.now(),
      },
    );

    const init = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const payload = JSON.parse(String(init.body)) as Record<string, string>;

    expect(payload.ConfirmationURL).toBe(
      "https://payments.zadhron.com/callbacks/payments/c2b/confirmation",
    );
    expect(payload.ValidationURL).toBe(
      "https://payments.zadhron.com/callbacks/payments/c2b/validation",
    );
  });

  test("retries once when Safaricom returns invalid access token on STK push", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-old", expires_in: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            errorCode: "404.001.03",
            errorMessage: "Invalid Access Token",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: "token-new", expires_in: 3600 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ResponseCode: "0",
            ResponseDescription: "Success. Request accepted for processing",
            MerchantRequestID: "mid-2",
            CheckoutRequestID: "ws_CO_2",
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
        accountReference: "INV1002",
        transactionDesc: "Token retry",
        transactionType: "CustomerPayBillOnline",
      },
      {
        requestId: "req-7",
        applicationId: "admin-console",
        route: "/api/mpesa/stk-push",
        method: "POST",
        startedAt: Date.now(),
      },
    );

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
