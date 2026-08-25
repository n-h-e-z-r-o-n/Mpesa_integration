"use client";

import { useMemo, useState } from "react";

import type { OperationDefinition } from "@/lib/gateway/catalog";
import { JsonViewer } from "@/components/ui/json-viewer";

type Props = {
  operations: OperationDefinition[];
};

export function EndpointTester({ operations }: Props) {
  const [selectedId, setSelectedId] = useState<string>(operations[0]?.id ?? "oauthToken");
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [rawMode, setRawMode] = useState(false);
  const [rawJson, setRawJson] = useState("{}");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [pending, setPending] = useState(false);
  const [responseState, setResponseState] = useState<{
    status: number;
    durationMs: number;
    body: unknown;
  } | null>(null);

  const operation = useMemo(
    () => operations.find((item) => item.id === selectedId) ?? operations[0],
    [operations, selectedId],
  );

  const requestPreview = useMemo(() => {
    if (!operation) {
      return {};
    }

    if (rawMode) {
      try {
        return JSON.parse(rawJson);
      } catch {
        return { invalidJson: true };
      }
    }

    return Object.fromEntries(
      operation.fields
        .filter((field) => formValues[field.name]?.trim())
        .map((field) => [field.name, field.type === "number" ? Number(formValues[field.name]) : formValues[field.name]]),
    );
  }, [formValues, operation, rawJson, rawMode]);

  if (!operation) {
    return null;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <section className="panel rounded-sm p-5">
        <label className="block text-sm text-slate-200">
          Operation
          <select
            className="mt-2 w-full rounded-sm border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
            value={operation.id}
            onChange={(event) => {
              setSelectedId(event.target.value);
              setFormValues({});
              setRawJson("{}");
              setResponseState(null);
            }}
          >
            {operations.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-4 text-sm text-[var(--text-muted)]">
          <div>{operation.method} {operation.route}</div>
          <p className="mt-2">{operation.description}</p>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-200">
          <input type="checkbox" checked={rawMode} onChange={(event) => setRawMode(event.target.checked)} />
          Developer raw JSON mode
        </label>

        {rawMode ? (
          <label className="mt-4 block text-sm text-slate-200">
            JSON payload
            <textarea
              value={rawJson}
              onChange={(event) => setRawJson(event.target.value)}
              className="mt-2 h-56 w-full rounded-sm border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 mono text-xs"
            />
          </label>
        ) : (
          <div className="mt-4 space-y-4">
            {operation.fields.map((field) => (
              <label key={field.name} className="block text-sm text-slate-200">
                <div className="flex items-center justify-between">
                  <span>{field.label}</span>
                  <span className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    {field.required ? "Required" : "Optional"}
                  </span>
                </div>
                {field.type === "textarea" ? (
                  <textarea
                    value={formValues[field.name] ?? ""}
                    onChange={(event) => setFormValues((current) => ({ ...current, [field.name]: event.target.value }))}
                    className="mt-2 h-28 w-full rounded-sm border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                  />
                ) : (
                  <input
                    value={formValues[field.name] ?? ""}
                    onChange={(event) => setFormValues((current) => ({ ...current, [field.name]: event.target.value }))}
                    className="mt-2 w-full rounded-sm border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                    type={field.type}
                  />
                )}
                <div className="mt-1 text-xs text-[var(--text-muted)]">{field.description}</div>
              </label>
            ))}
          </div>
        )}

        {operation.moneyMoving ? (
          <label className="mt-4 block text-sm text-slate-200">
            Idempotency-Key
            <input
              value={idempotencyKey}
              onChange={(event) => setIdempotencyKey(event.target.value)}
              className="mt-2 w-full rounded-sm border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 mono text-xs"
              placeholder="optional for retries and replay protection"
            />
          </label>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const startedAt = performance.now();
            const response = await fetch(`/api/admin/mpesa/operations/${operation.id}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
              },
              body: JSON.stringify(requestPreview),
            });
            const body = await response.json();
            setResponseState({
              status: response.status,
              durationMs: Math.round(performance.now() - startedAt),
              body,
            });
            setPending(false);
          }}
          className="mt-6 w-full rounded-sm border border-slate-500 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Sending..." : "Send Request"}
        </button>
      </section>

      <section className="space-y-6">
        <div className="panel rounded-sm p-5">
          <h2 className="text-base font-semibold text-white">Request Preview</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            This payload is posted to the Node admin test endpoint, which uses the same service layer as the application routes.
          </p>
          <div className="mt-4">
            <JsonViewer value={requestPreview} />
          </div>
        </div>

        <div className="panel rounded-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Gateway Response</h2>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Response status, latency, and normalized gateway body.
              </p>
            </div>
            {responseState ? (
              <div className="mono text-xs text-[var(--text-muted)]">
                {responseState.status} / {responseState.durationMs}ms
              </div>
            ) : null}
          </div>
          <div className="mt-4">
            <JsonViewer value={responseState?.body ?? { message: "No request sent yet." }} />
          </div>
        </div>
      </section>
    </div>
  );
}
