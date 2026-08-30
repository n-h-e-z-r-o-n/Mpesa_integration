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
    vi.doUnmock("@/lib/repositories/transaction-store");
    vi.doUnmock("@/lib/repositories/transaction-write-store");
    vi.doUnmock("@/lib/mpesa/client");
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

  test("precreates and then updates the same database transaction around an outbound payment", async () => {
    const persistDatabaseTransactionRecord = vi
      .fn()
      .mockResolvedValueOnce({
        id: "db-transaction-1",
        merchantId: "11111111-1111-4111-8111-111111111111",
      })
      .mockResolvedValueOnce({
        id: "db-transaction-1",
        merchantId: "11111111-1111-4111-8111-111111111111",
      });
    const persistTransactionSnapshot = vi.fn().mockResolvedValue(undefined);
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
    vi.doMock("@/lib/repositories/transaction-write-store", () => ({
      findDatabaseTransactionForCallbackPayload: async () => null,
      persistDatabaseTransactionRecord,
    }));
    vi.doMock("@/lib/repositories/telemetry-store", async () => {
      const actual = await vi.importActual<typeof import("@/lib/repositories/telemetry-store")>(
        "@/lib/repositories/telemetry-store",
      );

      return {
        ...actual,
        persistRequestLog: async () => undefined,
        persistTransactionSnapshot,
      };
    });

    const { executeMpesaOperation } = await import("@/services/mpesa/service");
    await executeMpesaOperation(
      "stkPush",
      {
        phoneNumber: "0714 415 034",
        amount: 10,
        accountReference: "INV-1001",
        transactionDesc: "Test payment",
      },
      {
        requestId: "req-1",
        applicationId: "admin-console",
        merchantId: "11111111-1111-4111-8111-111111111111",
        route: "/api/mpesa/stk-push",
        method: "POST",
        startedAt: Date.now(),
      },
    );

    expect(persistDatabaseTransactionRecord).toHaveBeenCalledTimes(2);
    expect(persistDatabaseTransactionRecord).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: "req-1",
        requestId: "req-1",
        applicationId: "admin-console",
        status: "pending",
        amount: 10,
        accountReference: "INV1001",
      }),
      expect.objectContaining({
        requestId: "req-1",
        applicationId: "admin-console",
        merchantId: "11111111-1111-4111-8111-111111111111",
      }),
    );
    expect(persistDatabaseTransactionRecord).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: "req-1",
        requestId: "req-1",
        applicationId: "admin-console",
        status: "pending",
        providerRequestId: "ws_CO_1",
        accountReference: "INV1001",
        responsePayload: expect.objectContaining({
          CheckoutRequestID: "ws_CO_1",
          MerchantRequestID: "mid-1",
        }),
      }),
      expect.objectContaining({
        requestId: "req-1",
        applicationId: "admin-console",
        merchantId: "11111111-1111-4111-8111-111111111111",
      }),
      {
        id: "db-transaction-1",
        merchantId: "11111111-1111-4111-8111-111111111111",
      },
    );
    expect(persistTransactionSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "req-1",
        providerRequestId: "ws_CO_1",
      }),
    );
  });

  test("marks a precreated transaction as failed when the outbound provider call throws", async () => {
    const persistDatabaseTransactionRecord = vi
      .fn()
      .mockResolvedValueOnce({
        id: "db-transaction-2",
        merchantId: "11111111-1111-4111-8111-111111111111",
      })
      .mockResolvedValueOnce({
        id: "db-transaction-2",
        merchantId: "11111111-1111-4111-8111-111111111111",
      });
    const persistTransactionSnapshot = vi.fn().mockResolvedValue(undefined);

    vi.doMock("@/lib/mpesa/client", () => ({
      postToMpesa: vi.fn().mockRejectedValue(
        Object.assign(new Error("Safaricom request failed"), {
          code: "mpesa_request_failed",
          status: 502,
          upstream: {
            errorCode: "500.001.1001",
            errorMessage: "Temporary provider failure",
          },
        }),
      ),
    }));
    vi.doMock("@/lib/repositories/transaction-write-store", () => ({
      findDatabaseTransactionForCallbackPayload: async () => null,
      persistDatabaseTransactionRecord,
    }));
    vi.doMock("@/lib/repositories/telemetry-store", async () => {
      const actual = await vi.importActual<typeof import("@/lib/repositories/telemetry-store")>(
        "@/lib/repositories/telemetry-store",
      );

      return {
        ...actual,
        persistRequestLog: async () => undefined,
        persistTransactionSnapshot,
      };
    });

    const { executeMpesaOperation } = await import("@/services/mpesa/service");

    await expect(
      executeMpesaOperation(
        "stkPush",
        {
          phoneNumber: "0714 415 034",
          amount: 10,
          accountReference: "INV-1002",
          transactionDesc: "Failure path",
        },
        {
          requestId: "req-failed",
          applicationId: "admin-console",
          merchantId: "11111111-1111-4111-8111-111111111111",
          route: "/api/mpesa/stk-push",
          method: "POST",
          startedAt: Date.now(),
        },
      ),
    ).rejects.toMatchObject({
      code: "mpesa_request_failed",
      status: 502,
    });

    expect(persistDatabaseTransactionRecord).toHaveBeenCalledTimes(2);
    expect(persistDatabaseTransactionRecord).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: "req-failed",
        status: "failed",
        responsePayload: expect.objectContaining({
          message: "Safaricom request failed",
        }),
      }),
      expect.objectContaining({
        requestId: "req-failed",
        applicationId: "admin-console",
      }),
      {
        id: "db-transaction-2",
        merchantId: "11111111-1111-4111-8111-111111111111",
      },
    );
    expect(persistTransactionSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "req-failed",
        status: "failed",
      }),
    );
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

    vi.doMock("@/lib/repositories/transaction-store", () => ({
      listDatabaseTransactions: async () => [
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
    }));

    vi.doMock("@/lib/repositories/telemetry-store", async () => {
      const actual = await vi.importActual<typeof import("@/lib/repositories/telemetry-store")>(
        "@/lib/repositories/telemetry-store",
      );

      return {
        ...actual,
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

  test("materializes a database transaction directly from a callback when no prior transaction exists", async () => {
    const persistTransactionSnapshot = vi.fn().mockResolvedValue(undefined);
    const persistDatabaseTransactionRecord = vi.fn().mockResolvedValue({
      id: "db-transaction-3",
      merchantId: "33333333-3333-4333-8333-333333333333",
    });
    const persistCallbackRecord = vi.fn().mockResolvedValue("provider-event-3");
    const linkStoredCallbackToTransaction = vi.fn().mockResolvedValue(undefined);

    vi.doMock("@/lib/repositories/telemetry-store", async () => {
      const actual = await vi.importActual<typeof import("@/lib/repositories/telemetry-store")>(
        "@/lib/repositories/telemetry-store",
      );

      return {
        ...actual,
        persistRequestLog: async () => undefined,
        persistTransactionSnapshot,
      };
    });

    vi.doMock("@/lib/repositories/callback-store", () => ({
      persistCallbackRecord,
      linkStoredCallbackToTransaction,
    }));

    vi.doMock("@/lib/repositories/transaction-write-store", () => ({
      findDatabaseTransactionForCallbackPayload: async () => null,
      persistDatabaseTransactionRecord,
    }));

    const { processMpesaCallback } = await import("@/services/mpesa/service");

    await processMpesaCallback(
      "pullTransactions",
      {
        TransID: "QWE123ABC",
        TransAmount: "125.50",
        MSISDN: "254700000001",
        BillRefNumber: "INV-1001",
      },
      "127.0.0.1",
    );

    expect(persistCallbackRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        callbackName: "pullTransactions",
      }),
    );
    expect(persistDatabaseTransactionRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "QWE123ABC",
        applicationId: "safaricom",
        operation: "pullTransactions",
        status: "succeeded",
        amount: 125.5,
        partyA: "254700000001",
        partyB: "174379",
        accountReference: "INV-1001",
        transactionId: "QWE123ABC",
        providerRequestId: "QWE123ABC",
        callbackPayloads: [expect.objectContaining({ TransID: "QWE123ABC" })],
      }),
      expect.objectContaining({
        applicationId: "safaricom",
        merchantId: undefined,
        route: "/api/mpesa/callbacks/pullTransactions",
        method: "POST",
      }),
      null,
    );
    expect(linkStoredCallbackToTransaction).toHaveBeenCalledWith(
      "provider-event-3",
      "db-transaction-3",
      "33333333-3333-4333-8333-333333333333",
    );
    expect(persistTransactionSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "QWE123ABC",
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
