"use server";

import {
  createMerchantApiKey,
  createMerchantWebhook,
  parseWebhookEventsInput,
} from "@/lib/repositories/merchant-access-store";
import type {
  MerchantApiKeySnapshot,
  MerchantWebhookSnapshot,
} from "@/lib/repositories/merchant-dashboard-store";

export type MerchantApiKeyActionState = {
  accessToken?: string;
  authorizationHeader?: string;
  createdKey?: MerchantApiKeySnapshot;
  message?: string;
  status: "idle" | "success" | "error";
};

export type MerchantWebhookActionState = {
  createdWebhook?: MerchantWebhookSnapshot;
  message?: string;
  signingSecret?: string;
  status: "idle" | "success" | "error";
};

export async function createMerchantApiKeyAction(
  _previousState: MerchantApiKeyActionState,
  formData: FormData,
): Promise<MerchantApiKeyActionState> {
  try {
    const result = await createMerchantApiKey({
      environment: String(formData.get("environment") ?? "live") === "sandbox" ? "sandbox" : "live",
      name: String(formData.get("name") ?? ""),
      scopes: ["*"],
    });

    return {
      status: "success",
      message: "Access token generated. Copy it now because the raw token is only shown once.",
      createdKey: result.apiKey,
      accessToken: result.plaintextToken,
      authorizationHeader: `Authorization: Bearer ${result.plaintextToken}`,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to create merchant API key.",
    };
  }
}

export async function createMerchantWebhookAction(
  _previousState: MerchantWebhookActionState,
  formData: FormData,
): Promise<MerchantWebhookActionState> {
  try {
    const result = await createMerchantWebhook({
      url: String(formData.get("url") ?? ""),
      environment: String(formData.get("environment") ?? "live") === "sandbox" ? "sandbox" : "live",
      subscribedEvents: parseWebhookEventsInput(String(formData.get("events") ?? "")),
    });

    return {
      status: "success",
      message: "Webhook saved. Copy the signing secret now because the raw secret is only shown once.",
      createdWebhook: result.webhook,
      signingSecret: result.signingSecret,
    };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Unable to create merchant webhook.",
    };
  }
}
