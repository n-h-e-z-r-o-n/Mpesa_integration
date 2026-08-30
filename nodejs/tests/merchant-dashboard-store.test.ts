import { afterEach, describe, expect, test, vi } from "vitest";

function createCountQuery(count: number) {
  const query = {
    eq: () => query,
    in: () => query,
    then: (resolve: (value: { count: number; data: null; error: null }) => unknown) =>
      Promise.resolve(resolve({ count, data: null, error: null })),
  };

  return query;
}

describe("merchant dashboard store", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/supabase/server");
  });

  test("builds a merchant-scoped snapshot from the authenticated Supabase client", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: async () => ({
        from: (table: string) => {
          if (table === "merchant_accounts") {
            return {
              select: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: "merchant-1",
                    business_name: "Acme Stores",
                    business_email: "ops@acme.test",
                    business_phone: "254700000001",
                    default_currency: "KES",
                    status: "active",
                    created_at: "2026-08-30T12:00:00.000Z",
                    updated_at: "2026-08-30T12:30:00.000Z",
                  },
                  error: null,
                }),
              }),
            };
          }

          if (table === "transactions") {
            return {
              select: (_columns: string, options?: { count?: string; head?: boolean }) => {
                if (options?.head) {
                  return options.count === "exact" ? createCountQuery(3) : createCountQuery(0);
                }

                const query = {
                  eq: () => query,
                  order: () => query,
                  limit: () => ({
                    returns: async () => ({
                      data: [
                        {
                          id: "tx-1",
                          provider: "mpesa",
                          provider_operation: "stkPush",
                          status: "succeeded",
                          amount: "250.00",
                          customer_msisdn: "254700000001",
                          account_reference: "INV-1001",
                          external_reference: null,
                          provider_request_id: "ws_CO_1",
                          provider_transaction_id: "RCP001",
                          idempotency_key: "idem-1",
                          created_at: "2026-08-30T13:00:00.000Z",
                          updated_at: "2026-08-30T13:01:00.000Z",
                          processing_started_at: "2026-08-30T13:00:00.000Z",
                          completed_at: "2026-08-30T13:01:00.000Z",
                          provider_metadata: {
                            requestId: "req-1",
                            applicationId: "merchant-app",
                            partyA: "254700000001",
                            callbackPayloads: [],
                          },
                        },
                        {
                          id: "tx-2",
                          provider: "mpesa",
                          provider_operation: "b2c",
                          status: "processing",
                          amount: "100.00",
                          customer_msisdn: "254700000002",
                          account_reference: "PAYOUT-2",
                          external_reference: null,
                          provider_request_id: "b2c-2",
                          provider_transaction_id: null,
                          idempotency_key: null,
                          created_at: "2026-08-30T14:00:00.000Z",
                          updated_at: "2026-08-30T14:00:30.000Z",
                          processing_started_at: "2026-08-30T14:00:00.000Z",
                          completed_at: null,
                          provider_metadata: {
                            requestId: "req-2",
                            applicationId: "merchant-app",
                            partyA: "174379",
                            callbackPayloads: [],
                          },
                        },
                      ],
                      error: null,
                    }),
                  }),
                };

                return query;
              },
            };
          }

          if (table === "api_keys") {
            return {
              select: () => {
                const query = {
                  eq: () => query,
                  order: () => ({
                    returns: async () => ({
                      data: [
                        {
                          id: "key-1",
                          name: "Live key",
                          environment: "live",
                          key_prefix: "zd_live_1234",
                          scopes: ["stkPush", "transactionStatus"],
                          last_used_at: "2026-08-30T14:10:00.000Z",
                          expires_at: null,
                          revoked_at: null,
                          created_at: "2026-08-29T10:00:00.000Z",
                        },
                      ],
                      error: null,
                    }),
                  }),
                };

                return query;
              },
            };
          }

          expect(table).toBe("webhooks");
          return {
            select: () => {
              const query = {
                eq: () => query,
                order: () => ({
                  returns: async () => ({
                    data: [
                      {
                        id: "webhook-1",
                        url: "https://merchant.test/hooks/payments",
                        environment: "live",
                        subscribed_events: ["transaction.succeeded", "transaction.failed"],
                        is_active: true,
                        created_at: "2026-08-29T11:00:00.000Z",
                        updated_at: "2026-08-30T14:15:00.000Z",
                      },
                    ],
                    error: null,
                  }),
                }),
              };

              return query;
            },
          };
        },
      }),
    }));

    const { getMerchantDashboardSnapshot } = await import("@/lib/repositories/merchant-dashboard-store");

    const snapshot = await getMerchantDashboardSnapshot({ transactionLimit: 25 });

    expect(snapshot.merchant).toMatchObject({
      id: "merchant-1",
      businessName: "Acme Stores",
      defaultCurrency: "KES",
      status: "active",
    });
    expect(snapshot.transactions).toHaveLength(2);
    expect(snapshot.transactions[0]).toMatchObject({
      id: "tx-1",
      requestId: "req-1",
      operation: "stkPush",
      status: "succeeded",
      amount: 250,
    });
    expect(snapshot.metrics).toMatchObject({
      totalTransactions: 3,
      pendingTransactions: 3,
      successfulTransactions: 1,
      totalCollectionsValue: 250,
      totalPayoutsValue: 0,
      activeApiKeyCount: 1,
      activeWebhookCount: 1,
      recentWindowSize: 2,
    });
    expect(snapshot.apiKeys[0]).toMatchObject({
      name: "Live key",
      keyPrefix: "zd_live_1234",
    });
    expect(snapshot.webhooks[0]).toMatchObject({
      url: "https://merchant.test/hooks/payments",
      isActive: true,
    });
  });

  test("returns an empty snapshot when no merchant account is available", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: async () => ({
        from: () => ({
          select: () => ({
            maybeSingle: async () => ({
              data: null,
              error: null,
            }),
          }),
        }),
      }),
    }));

    const { getMerchantDashboardSnapshot } = await import("@/lib/repositories/merchant-dashboard-store");
    const snapshot = await getMerchantDashboardSnapshot();

    expect(snapshot).toMatchObject({
      merchant: null,
      apiKeys: [],
      webhooks: [],
      transactions: [],
      metrics: {
        totalTransactions: 0,
        pendingTransactions: 0,
        successfulTransactions: 0,
      },
    });
  });
});
