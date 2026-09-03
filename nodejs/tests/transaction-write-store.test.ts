import { afterEach, describe, expect, test, vi } from "vitest";

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

describe("transaction write store", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/supabase/admin");
    delete process.env.GATEWAY_DEFAULT_MERCHANT_ID;
    Object.assign(process.env, baseEnv);
  });

  test("inserts a database transaction for financial operations when merchant context is available", async () => {
    Object.assign(process.env, {
      ...baseEnv,
      GATEWAY_DEFAULT_MERCHANT_ID: "11111111-1111-4111-8111-111111111111",
    });

    const insert = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: "db-transaction-1",
            merchant_account_id: "11111111-1111-4111-8111-111111111111",
          },
          error: null,
        }),
      }),
    });

    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          expect(table).toBe("transactions");
          const query = {
            eq: () => query,
            order: () => query,
            limit: () => query,
            returns: async () => ({
              data: [],
              error: null,
            }),
          };

          return {
            select: () => query,
            insert,
          };
        },
      }),
    }));

    const { persistDatabaseTransactionRecord } = await import("@/lib/repositories/transaction-write-store");

    const result = await persistDatabaseTransactionRecord(
      {
        id: "ws_CO_123",
        requestId: "req-1",
        provider: "mpesa",
        operation: "stkPush",
        applicationId: "admin-console",
        status: "pending",
        amount: 125,
        partyA: "254700000001",
        partyB: "174379",
        accountReference: "INV-1001",
        providerRequestId: "ws_CO_123",
        providerConversationId: "conv-1",
        idempotencyKey: "idem-1",
        createdAt: "2026-08-29T18:00:00.000Z",
        updatedAt: "2026-08-29T18:00:00.000Z",
        requestPayload: {
          Amount: 125,
          TransactionDesc: "Invoice payment",
        },
        responsePayload: {
          ResponseCode: "0",
          ResponseDescription: "Accepted",
        },
        callbackPayloads: [],
      },
      {
        requestId: "req-1",
        applicationId: "admin-console",
        apiKeyId: "api-key-1",
        merchantId: "11111111-1111-4111-8111-111111111111",
        route: "/api/mpesa/stk-push",
        method: "POST",
        startedAt: Date.now(),
      },
    );

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        merchant_account_id: "11111111-1111-4111-8111-111111111111",
        api_key_id: "api-key-1",
        environment: "sandbox",
        provider: "mpesa",
        provider_operation: "stkPush",
        transaction_type: "collection",
        status: "pending",
        amount: 125,
        provider_request_id: "ws_CO_123",
        idempotency_request_hash: expect.any(String),
        updated_at: "2026-08-29T18:00:00.000Z",
        provider_metadata: expect.objectContaining({
          recordId: "ws_CO_123",
          requestId: "req-1",
          applicationId: "admin-console",
        }),
      }),
    );
    expect(result).toEqual({
      id: "db-transaction-1",
      merchantId: "11111111-1111-4111-8111-111111111111",
    });
  });

  test("finds an existing database transaction from callback identifiers", async () => {
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          expect(table).toBe("transactions");
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      returns: async () => ({
                      data: [
                        {
                          id: "db-transaction-2",
                          merchant_account_id: "22222222-2222-4222-8222-222222222222",
                          provider_operation: "stkPush",
                        },
                      ],
                      error: null,
                    }),
                    }),
                  }),
                }),
              }),
            }),
          };
        },
      }),
    }));

    const { findDatabaseTransactionForCallbackPayload } = await import(
      "@/lib/repositories/transaction-write-store"
    );

    const result = await findDatabaseTransactionForCallbackPayload({
      CheckoutRequestID: "ws_CO_lookup",
      ResultCode: 0,
    });

    expect(result).toEqual({
      id: "db-transaction-2",
      merchantId: "22222222-2222-4222-8222-222222222222",
      operation: "stkPush",
    });
  });

  test("filters callback transaction lookups by allowed operations", async () => {
    const eq = vi.fn();
    const inFilter = vi.fn();

    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          expect(table).toBe("transactions");

          const query = {
            eq: (column: string, value: string) => {
              eq(column, value);
              return query;
            },
            in: (column: string, values: string[]) => {
              inFilter(column, values);
              return query;
            },
            order: () => query,
            limit: () => query,
            returns: async () => ({
              data: [
                {
                  id: "db-transaction-allowed",
                  merchant_account_id: "44444444-4444-4444-8444-444444444444",
                  provider_operation: "stkPush",
                },
              ],
              error: null,
            }),
          };

          return {
            select: () => query,
          };
        },
      }),
    }));

    const { findDatabaseTransactionForCallbackPayload } = await import(
      "@/lib/repositories/transaction-write-store"
    );

    const result = await findDatabaseTransactionForCallbackPayload(
      {
        CheckoutRequestID: "ws_CO_allowed",
        ResultCode: 0,
      },
      ["stkPush", "c2bSimulate"],
    );

    expect(inFilter).toHaveBeenCalledWith("provider_operation", ["stkPush", "c2bSimulate"]);
    expect(result).toEqual({
      id: "db-transaction-allowed",
      merchantId: "44444444-4444-4444-8444-444444444444",
      operation: "stkPush",
    });
  });

  test("resolves merchant_account_id from the logged-in admin user when admin context initiates the transaction", async () => {
    const insert = vi.fn().mockReturnValue({
      select: () => ({
        single: async () => ({
          data: {
            id: "db-transaction-3",
            merchant_account_id: "33333333-3333-4333-8333-333333333333",
          },
          error: null,
        }),
      }),
    });

    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          if (table === "merchant_accounts") {
            const query = {
              eq: () => query,
              order: () => query,
              limit: () => query,
              returns: async () => ({
                data: [{ id: "33333333-3333-4333-8333-333333333333" }],
                error: null,
              }),
            };

            return {
              select: () => query,
            };
          }

          expect(table).toBe("transactions");
          const query = {
            eq: () => query,
            order: () => query,
            limit: () => query,
            returns: async () => ({
              data: [],
              error: null,
            }),
          };

          return {
            select: () => query,
            insert,
          };
        },
      }),
    }));

    const { persistDatabaseTransactionRecord } = await import("@/lib/repositories/transaction-write-store");

    const result = await persistDatabaseTransactionRecord(
      {
        id: "req-admin",
        requestId: "req-admin",
        provider: "mpesa",
        operation: "stkPush",
        applicationId: "admin-console",
        status: "pending",
        amount: 125,
        partyA: "254700000001",
        partyB: "174379",
        accountReference: "INV-1001",
        createdAt: "2026-08-29T18:00:00.000Z",
        updatedAt: "2026-08-29T18:00:00.000Z",
        requestPayload: {
          Amount: 125,
        },
        callbackPayloads: [],
      },
      {
        requestId: "req-admin",
        applicationId: "admin-console",
        adminUserId: "user-admin-1",
        route: "/api/mpesa/stk-push",
        method: "POST",
        startedAt: Date.now(),
      },
    );

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        merchant_account_id: "33333333-3333-4333-8333-333333333333",
      }),
    );
    expect(result).toEqual({
      id: "db-transaction-3",
      merchantId: "33333333-3333-4333-8333-333333333333",
    });
  });

  test("inserts against the current transaction schema without application_id", async () => {
    const insert = vi.fn();
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "db-transaction-4",
        merchant_account_id: "11111111-1111-4111-8111-111111111111",
      },
      error: null,
    });

    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          expect(table).toBe("transactions");
          const query = {
            eq: () => query,
            order: () => query,
            limit: () => query,
            returns: async () => ({
              data: [],
              error: null,
            }),
          };

          return {
            select: () => query,
            insert: (...args: unknown[]) => {
              insert(...args);
              return {
                select: () => ({
                  single,
                }),
              };
            },
          };
        },
      }),
    }));

    const { persistDatabaseTransactionRecord } = await import("@/lib/repositories/transaction-write-store");

    await expect(
      persistDatabaseTransactionRecord(
        {
          id: "req-compat",
          requestId: "req-compat",
          provider: "mpesa",
          operation: "stkPush",
          applicationId: "admin-console",
          status: "pending",
          amount: 125,
          partyA: "254700000001",
          partyB: "174379",
          accountReference: "INV-1001",
          createdAt: "2026-08-29T18:00:00.000Z",
          updatedAt: "2026-08-29T18:00:00.000Z",
          requestPayload: {
            Amount: 125,
          },
          callbackPayloads: [],
        },
        {
          requestId: "req-compat",
          applicationId: "admin-console",
          merchantId: "11111111-1111-4111-8111-111111111111",
          route: "/api/mpesa/stk-push",
          method: "POST",
          startedAt: Date.now(),
        },
      ),
    ).resolves.toEqual({
      id: "db-transaction-4",
      merchantId: "11111111-1111-4111-8111-111111111111",
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(
      expect.not.objectContaining({
        application_id: expect.anything(),
      }),
    );
  });
});
