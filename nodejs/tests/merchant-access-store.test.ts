import { createHash } from "node:crypto";

import { afterEach, describe, expect, test, vi } from "vitest";

describe("merchant access store", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/supabase/server");
    vi.doUnmock("@/lib/supabase/admin");
    process.env.ADMIN_SESSION_SECRET = "12345678901234567890123456789012";
  });

  test("creates a merchant API key and stores only its hash", async () => {
    let insertedPayload: Record<string, unknown> | null = null;

    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: async () => ({
        auth: {
          getUser: async () => ({
            data: {
              user: { id: "auth-user-1" },
            },
          }),
        },
        from: () => ({
          select: () => ({
            maybeSingle: async () => ({
              data: { id: "merchant-1" },
              error: null,
            }),
          }),
        }),
      }),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          expect(table).toBe("api_keys");
          return {
            insert: (payload: Record<string, unknown>) => {
              insertedPayload = payload;
              return {
                select: () => ({
                  single: async () => ({
                    data: {
                      id: "api-key-1",
                      name: payload.name,
                      environment: payload.environment,
                      key_prefix: payload.key_prefix,
                      scopes: payload.scopes,
                      last_used_at: null,
                      expires_at: null,
                      revoked_at: null,
                      created_at: "2026-09-02T10:00:00.000Z",
                    },
                    error: null,
                  }),
                }),
              };
            },
          };
        },
      }),
    }));

    const { createMerchantApiKey } = await import("@/lib/repositories/merchant-access-store");
    const result = await createMerchantApiKey({
      name: "Primary live token",
      environment: "live",
    });

    expect(result.plaintextToken.startsWith("zd_live_")).toBe(true);
    expect(insertedPayload).toMatchObject({
      merchant_account_id: "merchant-1",
      name: "Primary live token",
      environment: "live",
      scopes: ["*"],
      key_prefix: result.plaintextToken.slice(0, 20),
      key_hash: createHash("sha256").update(result.plaintextToken).digest("hex"),
    });
    expect(result.apiKey).toMatchObject({
      id: "api-key-1",
      name: "Primary live token",
      environment: "live",
      keyPrefix: result.plaintextToken.slice(0, 20),
    });
  });

  test("creates a merchant webhook and stores an encrypted signing secret", async () => {
    let insertedPayload: Record<string, unknown> | null = null;

    vi.doMock("@/lib/supabase/server", () => ({
      createSupabaseServerClient: async () => ({
        auth: {
          getUser: async () => ({
            data: {
              user: { id: "auth-user-1" },
            },
          }),
        },
        from: () => ({
          select: () => ({
            maybeSingle: async () => ({
              data: { id: "merchant-1" },
              error: null,
            }),
          }),
        }),
      }),
    }));
    vi.doMock("@/lib/supabase/admin", () => ({
      createSupabaseAdminClient: () => ({
        from: (table: string) => {
          expect(table).toBe("webhooks");
          return {
            insert: (payload: Record<string, unknown>) => {
              insertedPayload = payload;
              return {
                select: () => ({
                  single: async () => ({
                    data: {
                      id: "webhook-1",
                      url: payload.url,
                      environment: payload.environment,
                      subscribed_events: payload.subscribed_events,
                      is_active: true,
                      created_at: "2026-09-02T11:00:00.000Z",
                      updated_at: "2026-09-02T11:00:00.000Z",
                    },
                    error: null,
                  }),
                }),
              };
            },
          };
        },
      }),
    }));

    const { createMerchantWebhook } = await import("@/lib/repositories/merchant-access-store");
    const result = await createMerchantWebhook({
      url: "https://merchant.example.com/hooks/zadhron",
      environment: "sandbox",
      subscribedEvents: ["transaction.succeeded", "transaction.failed"],
    });

    expect(result.signingSecret.startsWith("whsec_")).toBe(true);
    expect(insertedPayload).toMatchObject({
      merchant_account_id: "merchant-1",
      url: "https://merchant.example.com/hooks/zadhron",
      environment: "sandbox",
      subscribed_events: ["transaction.succeeded", "transaction.failed"],
      is_active: true,
    });
    const secretCiphertext = insertedPayload
      ? (insertedPayload["secret_ciphertext"] as string | undefined)
      : undefined;
    expect(secretCiphertext).not.toBe(result.signingSecret);
    expect(String(secretCiphertext).startsWith("v1:")).toBe(true);
    expect(result.webhook).toMatchObject({
      id: "webhook-1",
      url: "https://merchant.example.com/hooks/zadhron",
      environment: "sandbox",
    });
  });
});
