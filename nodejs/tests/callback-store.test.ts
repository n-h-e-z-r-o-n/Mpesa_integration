import { afterEach, describe, expect, test, vi } from "vitest";

const missingSourceIpError = {
  message: "Could not find the 'source_ip' column of 'provider_events' in the schema cache",
};

describe("callback store", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/supabase/admin");
  });

  test("retries callback inserts without source_ip when the live schema does not support it", async () => {
    const insert = vi.fn();
    const single = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: missingSourceIpError })
      .mockResolvedValueOnce({ data: { id: "provider-event-1" }, error: null });

    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: () => ({
          insert: (...args: unknown[]) => {
            insert(...args);
            return {
              select: () => ({
                single,
              }),
            };
          },
        }),
      }),
      hasSupabaseAdminAccess: () => true,
    }));

    const { persistCallbackRecord } = await import("@/lib/repositories/callback-store");

    await expect(
      persistCallbackRecord({
        id: "cb-1",
        requestId: "req-1",
        callbackName: "stk",
        provider: "mpesa",
        receivedAt: "2026-08-29T16:30:00.000Z",
        sourceIp: "127.0.0.1",
        processingStatus: "accepted",
        payload: {
          Body: {
            stkCallback: {
              CheckoutRequestID: "ws_CO_123",
              ResultCode: 0,
            },
          },
        },
      }),
    ).resolves.toBe("provider-event-1");

    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        source_ip: "127.0.0.1",
      }),
    );
    expect(insert).toHaveBeenNthCalledWith(
      2,
      expect.not.objectContaining({
        source_ip: expect.anything(),
      }),
    );
  });

  test("retries callback reads without source_ip when the live schema does not support it", async () => {
    const selectCalls: string[] = [];
    let limitCallCount = 0;

    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: () => ({
          select: (columns: string) => {
            selectCalls.push(columns);
            return {
              eq: () => ({
                order: () => ({
                  limit: async () => {
                    limitCallCount += 1;
                    if (limitCallCount === 1) {
                      return { data: null, error: missingSourceIpError };
                    }

                    return {
                      data: [
                        {
                          id: "cb-2",
                          event_type: "billManager",
                          payload: { invoice: "INV-1001" },
                          processing_status: "processed",
                          received_at: "2026-08-29T16:31:00.000Z",
                        },
                      ],
                      error: null,
                    };
                  },
                }),
              }),
            };
          },
        }),
      }),
      hasSupabaseAdminAccess: () => true,
    }));

    const { listStoredCallbacks } = await import("@/lib/repositories/callback-store");
    const callbacks = await listStoredCallbacks();

    expect(selectCalls).toEqual([
      "id, event_type, merchant_id, payload, processing_status, received_at, source_ip",
      "id, event_type, merchant_id, payload, processing_status, received_at",
    ]);
    expect(callbacks).toEqual([
      expect.objectContaining({
        id: "cb-2",
        callbackName: "billManager",
        sourceIp: undefined,
      }),
    ]);
  });
});
