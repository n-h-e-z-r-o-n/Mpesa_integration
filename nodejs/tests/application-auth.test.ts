import { afterEach, describe, expect, test, vi } from "vitest";

function createRequest(headers: Record<string, string>) {
  return {
    headers: new Headers(headers),
  };
}

describe("application auth", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/mpesa/config");
    vi.doUnmock("@/lib/repositories/merchant-access-store");
  });

  test("authenticates merchant bearer tokens", async () => {
    vi.doMock("@/lib/repositories/merchant-access-store", () => ({
      findMerchantApiKeyByToken: vi.fn().mockResolvedValue({
        id: "api-key-1",
        merchantId: "merchant-1",
        name: "Merchant live token",
        environment: "live",
        keyPrefix: "zd_live_1234567890",
        scopes: ["*"],
        createdAt: "2026-09-02T10:00:00.000Z",
      }),
    }));
    vi.doMock("@/lib/mpesa/config", () => ({
      getGatewayConfig: () => ({
        applications: [],
      }),
    }));

    const { authenticateApplication } = await import("@/lib/auth/application-auth");
    const result = await authenticateApplication(
      createRequest({
        authorization: "Bearer zd_live_token_value",
      }) as never,
      "stkPush",
    );

    expect(result).toMatchObject({
      id: "api-key-1",
      apiKeyId: "api-key-1",
      merchantId: "merchant-1",
      source: "api_key",
    });
  });

  test("authenticates merchant tokens sent in x-zadhron-app-secret", async () => {
    vi.doMock("@/lib/repositories/merchant-access-store", () => ({
      findMerchantApiKeyByToken: vi.fn().mockResolvedValue({
        id: "api-key-2",
        merchantId: "merchant-2",
        name: "Merchant compat token",
        environment: "live",
        keyPrefix: "zd_live_abcdefghijk",
        scopes: ["*"],
        createdAt: "2026-09-02T10:00:00.000Z",
      }),
    }));
    vi.doMock("@/lib/mpesa/config", () => ({
      getGatewayConfig: () => ({
        applications: [],
      }),
    }));

    const { authenticateApplication } = await import("@/lib/auth/application-auth");
    const result = await authenticateApplication(
      createRequest({
        "x-zadhron-app-id": "app_live",
        "x-zadhron-app-secret": "zd_live_vviyyidhZaZE02yGMCh1JA2FDbPnDywA",
      }) as never,
      "stkPush",
    );

    expect(result).toMatchObject({
      id: "api-key-2",
      merchantId: "merchant-2",
      source: "api_key",
    });
  });

  test("falls back to configured application credentials", async () => {
    vi.doMock("@/lib/repositories/merchant-access-store", () => ({
      findMerchantApiKeyByToken: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/lib/mpesa/config", () => ({
      getGatewayConfig: () => ({
        applications: [
          {
            id: "app_live",
            name: "Configured app",
            enabled: true,
            scopes: ["stkPush"],
            secret: "super-secret",
          },
        ],
      }),
    }));

    const { authenticateApplication } = await import("@/lib/auth/application-auth");
    const result = await authenticateApplication(
      createRequest({
        "x-zadhron-app-id": "app_live",
        "x-zadhron-app-secret": "super-secret",
      }) as never,
      "stkPush",
    );

    expect(result).toMatchObject({
      id: "app_live",
      name: "Configured app",
      source: "application",
    });
  });
});
