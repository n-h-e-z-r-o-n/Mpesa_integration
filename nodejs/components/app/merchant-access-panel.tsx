"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  createMerchantApiKeyAction,
  createMerchantWebhookAction,
  type MerchantApiKeyActionState,
  type MerchantWebhookActionState,
} from "@/app/app/dashboard/actions";
import { CopyableIdentifier } from "@/components/ui/copyable-identifier";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  MerchantApiKeySnapshot,
  MerchantWebhookSnapshot,
} from "@/lib/repositories/merchant-dashboard-store";

type Props = {
  initialApiKeys: MerchantApiKeySnapshot[];
  initialWebhooks: MerchantWebhookSnapshot[];
};

const initialApiKeyActionState: MerchantApiKeyActionState = {
  status: "idle",
};

const initialWebhookActionState: MerchantWebhookActionState = {
  status: "idle",
};

function keyState(key: MerchantApiKeySnapshot) {
  if (key.revokedAt) {
    return "cancelled";
  }

  if (key.expiresAt && Date.parse(key.expiresAt) < Date.now()) {
    return "failed";
  }

  return "healthy";
}

function webhookState(webhook: MerchantWebhookSnapshot) {
  return webhook.isActive ? "healthy" : "cancelled";
}

function shortUrl(value: string) {
  if (value.length <= 52) {
    return value;
  }

  return `${value.slice(0, 33)}...${value.slice(-14)}`;
}

function formatTimestamp(value?: string) {
  if (!value) {
    return "Unavailable";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unavailable";
  }

  return parsed.toLocaleString();
}

export function MerchantAccessPanel({ initialApiKeys, initialWebhooks }: Props) {
  const router = useRouter();
  const [apiKeyState, apiKeyAction, apiKeyPending] = useActionState(
    createMerchantApiKeyAction,
    initialApiKeyActionState,
  );
  const [webhookStateResult, webhookAction, webhookPending] = useActionState(
    createMerchantWebhookAction,
    initialWebhookActionState,
  );
  const apiKeys = apiKeyState.createdKey
    ? [apiKeyState.createdKey, ...initialApiKeys.filter((item) => item.id !== apiKeyState.createdKey?.id)]
    : initialApiKeys;
  const webhooks = webhookStateResult.createdWebhook
    ? [
        webhookStateResult.createdWebhook,
        ...initialWebhooks.filter((item) => item.id !== webhookStateResult.createdWebhook?.id),
      ]
    : initialWebhooks;

  useEffect(() => {
    if (apiKeyState.status !== "success" || !apiKeyState.createdKey) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }, [apiKeyState, router]);

  useEffect(() => {
    if (webhookStateResult.status !== "success" || !webhookStateResult.createdWebhook) {
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }, [router, webhookStateResult]);

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-[#0c1521] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">API access</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">API keys</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Generate a merchant access token for live API calls. Merchant-issued tokens authenticate with
          <span className="mono"> Authorization: Bearer &lt;token&gt;</span>.
        </p>

        <form
          key={apiKeyState.createdKey?.id ?? "api-key-form"}
          action={apiKeyAction}
          className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
            <label className="text-sm text-slate-200">
              Token label
              <input
                name="name"
                type="text"
                required
                placeholder="Production server"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#09111a] px-4 py-3 text-white outline-none transition focus:border-sky-500"
              />
            </label>

            <label className="text-sm text-slate-200">
              Environment
              <select
                name="environment"
                defaultValue="live"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#09111a] px-4 py-3 text-white outline-none transition focus:border-sky-500"
              >
                <option value="live">Live</option>
                <option value="sandbox">Sandbox</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-400">
              New tokens are created with full merchant scope for the current API surface.
            </div>
            <button
              type="submit"
              disabled={apiKeyPending}
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {apiKeyPending ? "Generating..." : "Generate access token"}
            </button>
          </div>

          {apiKeyState.message ? (
            <p className={`mt-4 text-sm ${apiKeyState.status === "error" ? "text-rose-300" : "text-emerald-300"}`}>
              {apiKeyState.message}
            </p>
          ) : null}
        </form>

        {apiKeyState.accessToken ? (
          <div className="mt-4 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/8 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">Copy now</div>
            <div className="mt-3">
              <CopyableIdentifier value={apiKeyState.accessToken} />
            </div>
            <div className="mono mt-3 break-all rounded-2xl border border-white/10 bg-[#09111a] px-4 py-3 text-xs text-slate-200">
              {apiKeyState.authorizationHeader}
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {apiKeys.length ? (
            apiKeys.map((key) => (
              <article key={key.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-base font-medium text-white">{key.name}</div>
                  <StatusBadge value={keyState(key)} />
                </div>
                <div className="mono mt-3 text-xs text-slate-300">{key.keyPrefix}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                    {key.environment}
                  </span>
                  {key.scopes.map((scope) => (
                    <span
                      key={`${key.id}-${scope}`}
                      className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-300"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-sm leading-7 text-slate-400">
                  Last used {formatTimestamp(key.lastUsedAt)}. Created {formatTimestamp(key.createdAt)}.
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title="No API keys"
              description="Generate an access token to authenticate merchant API requests from your server."
            />
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#0c1521] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Outgoing delivery</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Webhooks</h2>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          Register the endpoint where Zadhron should deliver merchant transaction events.
        </p>

        <form
          key={webhookStateResult.createdWebhook?.id ?? "webhook-form"}
          action={webhookAction}
          className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4"
        >
          <div className="grid gap-4">
            <label className="text-sm text-slate-200">
              Endpoint URL
              <input
                name="url"
                type="url"
                required
                placeholder="https://merchant.example.com/api/webhooks/zadhron"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#09111a] px-4 py-3 text-white outline-none transition focus:border-sky-500"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
              <label className="text-sm text-slate-200">
                Environment
                <select
                  name="environment"
                  defaultValue="live"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#09111a] px-4 py-3 text-white outline-none transition focus:border-sky-500"
                >
                  <option value="live">Live</option>
                  <option value="sandbox">Sandbox</option>
                </select>
              </label>

              <label className="text-sm text-slate-200">
                Events
                <input
                  name="events"
                  type="text"
                  placeholder="transaction.succeeded, transaction.failed"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#09111a] px-4 py-3 text-white outline-none transition focus:border-sky-500"
                />
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-400">
              Leave events blank to use the default transaction lifecycle subscriptions.
            </div>
            <button
              type="submit"
              disabled={webhookPending}
              className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {webhookPending ? "Saving..." : "Add webhook"}
            </button>
          </div>

          {webhookStateResult.message ? (
            <p
              className={`mt-4 text-sm ${
                webhookStateResult.status === "error" ? "text-rose-300" : "text-emerald-300"
              }`}
            >
              {webhookStateResult.message}
            </p>
          ) : null}
        </form>

        {webhookStateResult.signingSecret ? (
          <div className="mt-4 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/8 p-4">
            <div className="text-[11px] uppercase tracking-[0.16em] text-emerald-300">Signing secret</div>
            <div className="mt-3">
              <CopyableIdentifier value={webhookStateResult.signingSecret} />
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {webhooks.length ? (
            webhooks.map((webhook) => (
              <article key={webhook.id} className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-base font-medium text-white">{shortUrl(webhook.url)}</div>
                  <StatusBadge value={webhookState(webhook)} />
                </div>
                <div className="mono mt-3 break-all text-xs text-slate-300">{webhook.url}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">
                    {webhook.environment}
                  </span>
                  {webhook.subscribedEvents.map((eventName) => (
                    <span
                      key={`${webhook.id}-${eventName}`}
                      className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-slate-300"
                    >
                      {eventName}
                    </span>
                  ))}
                </div>
                <div className="mt-3 text-sm leading-7 text-slate-400">
                  Updated {formatTimestamp(webhook.updatedAt)}.
                </div>
              </article>
            ))
          ) : (
            <EmptyState
              title="No webhooks configured"
              description="Add an endpoint to receive transaction result and lifecycle events from Zadhron."
            />
          )}
        </div>
      </section>
    </div>
  );
}
