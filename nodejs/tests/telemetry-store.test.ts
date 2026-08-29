import { afterEach, describe, expect, test, vi } from "vitest";

describe("telemetry store", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/supabase/admin");
  });

  test("persists structured audit logs in the audit_logs table", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });

    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          expect(table).toBe("audit_logs");
          return {
            insert,
          };
        },
      }),
    }));

    const { persistAuditLog } = await import("@/lib/repositories/telemetry-store");

    await expect(
      persistAuditLog({
        id: "audit-1",
        level: "info",
        message: "Gateway request accepted",
        timestamp: "2026-08-29T18:00:00.000Z",
        data: {
          requestId: "req-1",
        },
      }),
    ).resolves.toBeUndefined();

    expect(insert).toHaveBeenCalledWith({
      action: "gateway_audit_log",
      entity_type: "gateway_audit_log",
      metadata: {
        id: "audit-1",
        level: "info",
        message: "Gateway request accepted",
        timestamp: "2026-08-29T18:00:00.000Z",
        data: {
          requestId: "req-1",
        },
      },
    });
  });

  test("loads structured audit logs from persisted metadata", async () => {
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          expect(table).toBe("audit_logs");
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  limit: async () => ({
                    data: [
                      {
                        created_at: "2026-08-29T18:05:00.000Z",
                        metadata: {
                          id: "audit-2",
                          level: "warn",
                          message: "Persisted warning",
                          timestamp: "2026-08-29T18:05:00.000Z",
                          data: {
                            requestId: "req-2",
                          },
                        },
                      },
                      {
                        created_at: "2026-08-29T18:06:00.000Z",
                        metadata: {
                          id: "broken-row",
                          level: "debug",
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
      }),
    }));

    const { listStoredAuditLogs } = await import("@/lib/repositories/telemetry-store");
    const logs = await listStoredAuditLogs();

    expect(logs).toEqual([
      {
        id: "audit-2",
        level: "warn",
        message: "Persisted warning",
        timestamp: "2026-08-29T18:05:00.000Z",
        data: {
          requestId: "req-2",
        },
      },
    ]);
  });
});
