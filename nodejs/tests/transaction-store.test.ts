import { afterEach, describe, expect, test, vi } from "vitest";

describe("transaction store", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/supabase/admin");
  });

  test("maps database transactions into the admin transaction record shape", async () => {
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          expect(table).toBe("transactions");
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    returns: async () => ({
                      data: [
                        {
                          id: "tx-1",
                          provider: "mpesa",
                          provider_operation: "stkPush",
                          status: "processing",
                          amount: "125.50",
                          customer_msisdn: "254700000001",
                          account_reference: "INV-1001",
                          external_reference: null,
                          provider_request_id: "mid-1",
                          provider_transaction_id: "receipt-1",
                          idempotency_key: "idem-1",
                          created_at: "2026-08-29T18:00:00.000Z",
                          updated_at: "2026-08-29T18:02:00.000Z",
                          processing_started_at: "2026-08-29T18:01:00.000Z",
                          completed_at: null,
                          provider_metadata: {
                            requestId: "req-1",
                            applicationId: "admin-console",
                            partyA: "174379",
                            providerConversationId: "conv-1",
                            providerOriginatorConversationId: "origin-1",
                            updatedAt: "2026-08-29T18:02:00.000Z",
                            requestPayload: { Amount: 125.5 },
                            responsePayload: { ResponseCode: "0" },
                            callbackPayloads: [{ ResultCode: 0 }],
                          },
                        },
                      ],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          };
        },
      }),
    }));

    const { listDatabaseTransactions } = await import("@/lib/repositories/transaction-store");
    const transactions = await listDatabaseTransactions();

    expect(transactions).toEqual([
      {
        id: "tx-1",
        requestId: "req-1",
        provider: "mpesa",
        operation: "stkPush",
        applicationId: "admin-console",
        status: "accepted",
        amount: 125.5,
        partyA: "174379",
        partyB: "254700000001",
        accountReference: "INV-1001",
        transactionId: "receipt-1",
        providerRequestId: "mid-1",
        providerConversationId: "conv-1",
        providerOriginatorConversationId: "origin-1",
        idempotencyKey: "idem-1",
        createdAt: "2026-08-29T18:00:00.000Z",
        updatedAt: "2026-08-29T18:02:00.000Z",
        requestPayload: { Amount: 125.5 },
        responsePayload: { ResponseCode: "0" },
        callbackPayloads: [{ ResultCode: 0 }],
      },
    ]);
  });

  test("returns null when database transaction access is unavailable", async () => {
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => null,
    }));

    const { listDatabaseTransactions } = await import("@/lib/repositories/transaction-store");
    await expect(listDatabaseTransactions()).resolves.toBeNull();
  });

  test("reads the current transaction schema without application_id", async () => {
    const selectCalls: string[] = [];

    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          expect(table).toBe("transactions");
          return {
            select: (columns: string) => {
              selectCalls.push(columns);
              return {
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      returns: async () => ({
                        data: [
                          {
                            id: "tx-compat",
                            provider: "mpesa",
                            provider_operation: "stkPush",
                            status: "processing",
                            amount: "125.50",
                            customer_msisdn: "254700000001",
                            account_reference: "INV-1001",
                            external_reference: null,
                            provider_request_id: "mid-1",
                            provider_transaction_id: "receipt-1",
                            idempotency_key: "idem-1",
                            created_at: "2026-08-29T18:00:00.000Z",
                            updated_at: "2026-08-29T18:02:00.000Z",
                            processing_started_at: "2026-08-29T18:01:00.000Z",
                            completed_at: null,
                            provider_metadata: {
                              requestId: "req-1",
                              applicationId: "admin-console",
                              partyA: "174379",
                              requestPayload: { Amount: 125.5 },
                              callbackPayloads: [],
                            },
                          },
                        ],
                        error: null,
                      }),
                    }),
                  }),
                }),
              };
            },
          };
        },
      }),
    }));

    const { listDatabaseTransactions } = await import("@/lib/repositories/transaction-store");
    const transactions = await listDatabaseTransactions();

    expect(selectCalls).toEqual([
      "id, provider, provider_operation, status, amount, customer_msisdn, account_reference, external_reference, provider_request_id, provider_transaction_id, idempotency_key, created_at, updated_at, processing_started_at, completed_at, provider_metadata",
    ]);
    expect(transactions?.[0]).toMatchObject({
      id: "tx-compat",
      applicationId: "admin-console",
    });
  });
});
