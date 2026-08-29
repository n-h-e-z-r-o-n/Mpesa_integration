import { afterEach, describe, expect, test, vi } from "vitest";

describe("admin dashboard store", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/supabase/admin");
  });

  test("maps admin dashboard projection rows into application snapshot shape", async () => {
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          if (table === "admin_dashboard_state") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      dashboard_key: "primary",
                      transaction_processing_count: 4,
                      transaction_pending_count: 6,
                      transaction_succeeded_count: 18,
                      transaction_failed_count: 3,
                      callback_count: 28,
                      request_count: 30,
                      failed_request_count: 2,
                      slow_request_count: 5,
                      active_application_count: 7,
                      collections_today: "1000.50",
                      payouts_today: "250.25",
                      net_flow_today: "750.25",
                      balance_status: "available",
                      balance_currency: "KES",
                      balance_total_current: "2300.75",
                      balance_total_available: "2100.5",
                      balance_account_count: 2,
                      latest_transaction_at: "2026-08-29T18:00:00.000Z",
                      latest_callback_at: "2026-08-29T18:05:00.000Z",
                      latest_request_at: "2026-08-29T18:06:00.000Z",
                      latest_balance_callback_at: "2026-08-29T18:04:00.000Z",
                      oldest_pending_created_at: "2026-08-29T16:00:00.000Z",
                      projection_updated_at: "2026-08-29T18:06:30.000Z",
                    },
                    error: null,
                  }),
                }),
              }),
            };
          }

          expect(table).toBe("admin_dashboard_balance_accounts");
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  returns: async () => ({
                    data: [
                      {
                        account_name: "Utility Account",
                        currency: "KES",
                        current_amount: "2300.75",
                        available_amount: "2100.50",
                        reserved_amount: "100.00",
                        uncleared_amount: "100.25",
                        snapshot_at: "2026-08-29T18:04:00.000Z",
                        source_provider_event_id: "event-1",
                      },
                    ],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        },
      }),
    }));

    const { getAdminDashboardSnapshot } = await import("@/lib/repositories/admin-dashboard-store");
    const snapshot = await getAdminDashboardSnapshot();

    expect(snapshot).toEqual({
      dashboardKey: "primary",
      transactionProcessingCount: 4,
      transactionPendingCount: 6,
      transactionSucceededCount: 18,
      transactionFailedCount: 3,
      callbackCount: 28,
      requestCount: 30,
      failedRequestCount: 2,
      slowRequestCount: 5,
      activeApplicationCount: 7,
      collectionsToday: 1000.5,
      payoutsToday: 250.25,
      netFlowToday: 750.25,
      balanceStatus: "available",
      balanceCurrency: "KES",
      balanceTotalCurrent: 2300.75,
      balanceTotalAvailable: 2100.5,
      balanceAccountCount: 2,
      latestTransactionAt: "2026-08-29T18:00:00.000Z",
      latestCallbackAt: "2026-08-29T18:05:00.000Z",
      latestRequestAt: "2026-08-29T18:06:00.000Z",
      latestBalanceCallbackAt: "2026-08-29T18:04:00.000Z",
      oldestPendingCreatedAt: "2026-08-29T16:00:00.000Z",
      projectionUpdatedAt: "2026-08-29T18:06:30.000Z",
      balanceAccounts: [
        {
          accountName: "Utility Account",
          currency: "KES",
          currentAmount: 2300.75,
          availableAmount: 2100.5,
          reservedAmount: 100,
          unclearedAmount: 100.25,
          snapshotAt: "2026-08-29T18:04:00.000Z",
          sourceProviderEventId: "event-1",
        },
      ],
    });
  });

  test("returns null when admin dashboard projection is unavailable", async () => {
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => null,
    }));

    const { getAdminDashboardSnapshot } = await import("@/lib/repositories/admin-dashboard-store");
    await expect(getAdminDashboardSnapshot()).resolves.toBeNull();
  });
});
