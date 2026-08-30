import Link from "next/link";

import { CopyableIdentifier } from "@/components/ui/copyable-identifier";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  MerchantApiKeySnapshot,
  MerchantDashboardSnapshot,
  MerchantWebhookSnapshot,
} from "@/lib/repositories/merchant-dashboard-store";
import type { AuthenticatedAppUser } from "@/lib/auth/app-session";
import type { TransactionRecord } from "@/types/gateway";

type Props = {
  snapshot: MerchantDashboardSnapshot;
  user: AuthenticatedAppUser;
};

function formatCurrency(amount: number, currency = "KES") {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
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

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function shortUrl(value: string) {
  if (value.length <= 52) {
    return value;
  }

  return `${value.slice(0, 33)}...${value.slice(-14)}`;
}

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

function transactionCounterparty(transaction: TransactionRecord) {
  return transaction.partyA ?? transaction.partyB ?? transaction.accountReference ?? transaction.transactionId ?? "n/a";
}

function TransactionsSection({
  transactions,
  currency,
}: {
  transactions: TransactionRecord[];
  currency: string;
}) {
  if (!transactions.length) {
    return (
      <EmptyState
        title="No transactions yet"
        description="When your gateway traffic starts landing in the database, recent merchant transactions will appear here with provider references and lifecycle status."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0d1724]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-[11px] uppercase tracking-[0.16em] text-slate-400">
            <tr>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Operation</th>
              <th className="px-4 py-3">Counterparty</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Provider ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="border-t border-white/10">
                <td className="px-4 py-3">
                  <CopyableIdentifier value={transaction.requestId} />
                </td>
                <td className="px-4 py-3 text-slate-100">{transaction.operation}</td>
                <td className="px-4 py-3 mono text-xs text-slate-300">{transactionCounterparty(transaction)}</td>
                <td className="px-4 py-3 text-slate-100">
                  {typeof transaction.amount === "number" ? formatCurrency(transaction.amount, currency) : "n/a"}
                </td>
                <td className="px-4 py-3">
                  <CopyableIdentifier value={transaction.transactionId ?? transaction.providerRequestId} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge value={transaction.status} />
                </td>
                <td className="px-4 py-3 text-slate-400">{formatTimestamp(transaction.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MerchantDashboard({ snapshot, user }: Props) {
  if (!snapshot.merchant) {
    return (
      <main className="min-h-screen bg-[#09111a] px-5 py-12 text-white sm:px-8">
        <div className="mx-auto max-w-[1180px]">
          <EmptyState
            title="Merchant setup incomplete"
            description="Your user session is active, but no merchant account is available yet. Complete onboarding to activate the merchant workspace."
          />
        </div>
      </main>
    );
  }

  const merchant = snapshot.merchant;
  const recentTransactions = snapshot.transactions.slice(0, 12);

  return (
    <main className="min-h-screen bg-[#09111a] px-5 py-10 text-white sm:px-8 lg:py-12">
      <div className="mx-auto max-w-[1480px] space-y-7">
        <section className="overflow-hidden rounded-[2.2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(74,155,255,0.2),transparent_30%),linear-gradient(135deg,#101b31_0%,#0a1220_58%,#060c16_100%)] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.26)]">
          <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-sky-200">
                  Merchant workspace
                </span>
                <StatusBadge value={merchant.status} />
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
                {merchant.businessName}
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-slate-200/88">
                Signed in as <span className="mono text-white">{user.email}</span>. This dashboard is scoped to
                your merchant account and reads through the normal authenticated Supabase session on
                August 30, 2026.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/docs"
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
                >
                  Integration docs
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-full border border-white/15 px-5 py-3 text-sm text-white transition hover:bg-white/5"
                >
                  Pricing
                </Link>
                <Link
                  href="/"
                  className="rounded-full border border-white/15 px-5 py-3 text-sm text-white transition hover:bg-white/5"
                >
                  Public site
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Business email</div>
                <div className="mt-3 text-lg font-medium text-white">{merchant.businessEmail ?? "Not set"}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Business phone</div>
                <div className="mt-3 text-lg font-medium text-white">{merchant.businessPhone ?? "Not set"}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Default currency</div>
                <div className="mt-3 text-lg font-medium text-white">{merchant.defaultCurrency}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-300">Merchant created</div>
                <div className="mt-3 text-lg font-medium text-white">{formatTimestamp(merchant.createdAt)}</div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[1.6rem] border border-white/10 bg-[#0d1724] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Recent success rate</div>
            <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
              {formatPercent(snapshot.metrics.successRate)}
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-400">
              Based on the latest {snapshot.metrics.recentWindowSize} stored transactions in this merchant view.
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-[#0d1724] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">In-flight transactions</div>
            <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
              {snapshot.metrics.pendingTransactions}
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-400">
              Transactions currently pending or still processing through provider callbacks.
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-[#0d1724] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Collections</div>
            <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
              {formatCurrency(snapshot.metrics.totalCollectionsValue, merchant.defaultCurrency)}
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-400">
              Successful collection value in the current dashboard window.
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-[#0d1724] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Payouts</div>
            <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
              {formatCurrency(snapshot.metrics.totalPayoutsValue, merchant.defaultCurrency)}
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-400">
              Successful outbound value in the current dashboard window.
            </div>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-[#0d1724] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Net flow</div>
            <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">
              {formatCurrency(snapshot.metrics.netFlowValue, merchant.defaultCurrency)}
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-400">
              Collections minus payouts across the same recent merchant transaction window.
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.6rem] border border-white/10 bg-[#0d1724] p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Stored transactions</div>
            <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">{snapshot.metrics.totalTransactions}</div>
            <div className="mt-3 text-sm leading-6 text-slate-400">Successful, failed, cancelled, and pending records visible to this merchant.</div>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-[#0d1724] p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Successful</div>
            <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">{snapshot.metrics.successfulTransactions}</div>
            <div className="mt-3 text-sm leading-6 text-slate-400">Transactions that reached a succeeded state in the current window.</div>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-[#0d1724] p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">API keys</div>
            <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">{snapshot.metrics.activeApiKeyCount}</div>
            <div className="mt-3 text-sm leading-6 text-slate-400">Currently visible active keys for this merchant account.</div>
          </div>
          <div className="rounded-[1.6rem] border border-white/10 bg-[#0d1724] p-5">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Webhooks</div>
            <div className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white">{snapshot.metrics.activeWebhookCount}</div>
            <div className="mt-3 text-sm leading-6 text-slate-400">Configured active merchant delivery endpoints.</div>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
          <div className="rounded-[2rem] border border-white/10 bg-[#0c1521] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Recent transactions</div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Merchant transaction flow</h2>
              </div>
              <div className="text-sm text-slate-400">
                Latest activity {formatTimestamp(snapshot.metrics.latestTransactionAt)}
              </div>
            </div>
            <div className="mt-6">
              <TransactionsSection transactions={recentTransactions} currency={merchant.defaultCurrency} />
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-white/10 bg-[#0c1521] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">API access</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Merchant API keys</h2>
              <div className="mt-5 space-y-4">
                {snapshot.apiKeys.length ? (
                  snapshot.apiKeys.map((key) => (
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
                    description="Merchant API keys will appear here once backend key management is enabled for this account."
                  />
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#0c1521] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Outgoing delivery</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Merchant webhooks</h2>
              <div className="mt-5 space-y-4">
                {snapshot.webhooks.length ? (
                  snapshot.webhooks.map((webhook) => (
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
                    description="When merchant webhook delivery is configured, subscribed events and endpoint status will appear here."
                  />
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
