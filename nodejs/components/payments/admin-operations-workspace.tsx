"use client";

import { EndpointTester } from "@/components/payments/endpoint-tester";
import type { OperationDefinition } from "@/lib/gateway/catalog";

type Props = {
  operations: OperationDefinition[];
};

const highlights = [
  {
    title: "Pull transaction status",
    body: "Run M-Pesa transaction lookups with the provider transaction ID when support or reconciliation needs a live answer.",
  },
  {
    title: "Refresh account balance",
    body: "Query the configured shortcode balance before disbursements, reversals, or treasury-sensitive operations.",
  },
  {
    title: "Register callbacks",
    body: "Update C2B validation and confirmation routing, or refresh pull-transactions registration, without leaving the admin console.",
  },
];

export function AdminOperationsWorkspace({ operations }: Props) {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {highlights.map((item) => (
          <article
            key={item.title}
            className="rounded-[1.4rem] border border-[var(--border)] bg-[var(--surface-2)] p-5"
          >
            <div className="text-sm font-medium text-white">{item.title}</div>
            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">{item.body}</p>
          </article>
        ))}
      </div>

      <EndpointTester operations={operations} />
    </section>
  );
}
