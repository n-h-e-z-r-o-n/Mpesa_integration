import type { GatewayConfig } from "@/lib/mpesa/types";
import { operationCatalog, type OperationDefinition } from "@/lib/gateway/catalog";
import type { MpesaOperation } from "@/types/gateway";

import { DocHeading } from "@/components/public/doc-heading";
import { DocsCodeTabs, type CodeTab } from "@/components/public/docs-code-tabs";
import {
  DeveloperDocsShell,
  type DocsSidebarSection,
  type DocsTocItem,
} from "@/components/public/developer-docs-shell";

type Props = {
  config: GatewayConfig;
  operations: OperationDefinition[];
};

type CallbackDoc = {
  key: string;
  label: string;
  purpose: string;
  operations: MpesaOperation[];
};

type StatusRow = {
  label: string;
  description: string;
};

type ErrorRow = {
  code: string;
  description: string;
  status: number;
};

type EndpointDoc = {
  authentication: string[];
  description: string;
  errors: ErrorRow[];
  id: string;
  immediateResponse: CodeTab[];
  method: "GET" | "POST";
  notes?: string[];
  parameters: Array<{
    defaultValue?: string;
    description: string;
    name: string;
    required: boolean;
    type: string;
  }>;
  requestExamples: CodeTab[];
  route: string;
  statusHeading?: string;
  statuses: StatusRow[];
  title: string;
  webhook?: {
    callbackLabel?: string;
    callbackUrl?: string;
    description: string;
    examples: CodeTab[];
  };
};

const callbackDocs: CallbackDoc[] = [
  { key: "stk", label: "STK callback", purpose: "Finalizes STK checkout outcome payloads.", operations: ["stkPush"] },
  {
    key: "c2bConfirmation",
    label: "C2B confirmation",
    purpose: "Receives the final confirmation payload for incoming C2B transactions.",
    operations: ["c2bRegister", "c2bSimulate", "stkPush"],
  },
  {
    key: "c2bValidation",
    label: "C2B validation",
    purpose: "Receives pre-confirmation validation requests for registered C2B URLs.",
    operations: ["c2bRegister"],
  },
  {
    key: "b2cResult",
    label: "B2C result",
    purpose: "Receives the terminal payout result for B2C and Business to Pochi requests.",
    operations: ["b2c", "businessToPochi"],
  },
  {
    key: "b2cTimeout",
    label: "B2C timeout",
    purpose: "Receives queue timeout notices for B2C and Business to Pochi requests.",
    operations: ["b2c", "businessToPochi"],
  },
  { key: "b2bResult", label: "B2B result", purpose: "Receives the terminal B2B result payload.", operations: ["b2b"] },
  { key: "b2bTimeout", label: "B2B timeout", purpose: "Receives B2B queue timeout notices.", operations: ["b2b"] },
  {
    key: "transactionStatusResult",
    label: "Transaction status result",
    purpose: "Returns the asynchronous answer for provider-side transaction-status queries.",
    operations: ["transactionStatus"],
  },
  {
    key: "transactionStatusTimeout",
    label: "Transaction status timeout",
    purpose: "Returns timeout notices for provider-side transaction-status queries.",
    operations: ["transactionStatus"],
  },
  { key: "reversalResult", label: "Reversal result", purpose: "Receives the final reversal outcome.", operations: ["reversal"] },
  { key: "reversalTimeout", label: "Reversal timeout", purpose: "Receives reversal queue timeout notices.", operations: ["reversal"] },
  {
    key: "accountBalanceResult",
    label: "Account balance result",
    purpose: "Returns the official provider balance snapshot for the configured shortcode.",
    operations: ["accountBalance"],
  },
  {
    key: "accountBalanceTimeout",
    label: "Account balance timeout",
    purpose: "Returns timeout notices for account-balance queries.",
    operations: ["accountBalance"],
  },
  { key: "ratiba", label: "Ratiba callback", purpose: "Receives Ratiba downstream payloads.", operations: ["ratiba"] },
  {
    key: "pullTransactions",
    label: "Pull Transactions callback",
    purpose: "Receives pull-transactions registration or query responses.",
    operations: ["pullTransactions", "pullTransactionsQuery", "pullTransactionsRegister"],
  },
  {
    key: "billManager",
    label: "Bill Manager callback",
    purpose: "Receives downstream Bill Manager acknowledgements and events.",
    operations: [
      "billManager",
      "billManagerOptin",
      "billManagerChangeOptinDetails",
      "billManagerCreateSingleInvoice",
      "billManagerCreateBulkInvoices",
      "billManagerCancelSingleInvoice",
      "billManagerCancelBulkInvoices",
      "billManagerReconciliation",
    ],
  },
];

const endpointNotes: Partial<Record<MpesaOperation, string[]>> = {
  stkPush: [
    "The initial HTTP response only means Zadhron and Safaricom accepted the request for processing.",
    "The gateway sanitizes accountReference to 12 alphanumeric characters and transactionDesc to 13 alphanumeric characters before forwarding the request.",
  ],
  stkQuery: [
    "This route queries Safaricom directly using a previous CheckoutRequestID.",
    "Use it when the transaction is still pending or when the handset callback has not arrived yet.",
  ],
  b2c: [
    "Provide an Idempotency-Key whenever you retry after a timeout or network uncertainty.",
    "The terminal result arrives through the configured B2C callback URLs, not in the initial response.",
  ],
  b2b: [
    "The gateway supplies the configured shortcode as PartyA and the request receiverShortcode as PartyB.",
    "The final result still arrives asynchronously through result or timeout callbacks.",
  ],
  businessToPochi: [
    "This shares the B2C-style callback rail in the current implementation.",
    "Use it only when the B2Pochi product is provisioned for your shortcode.",
  ],
  transactionStatus: [
    "This is an asynchronous provider query and is distinct from Zadhron's own stored transaction lookup endpoint.",
    "Use it when you need Safaricom's terminal view of a transaction, not just the latest Zadhron record.",
  ],
  reversal: [
    "The initial response only confirms acceptance into Safaricom's reversal pipeline.",
    "Treat the reversalResult or reversalTimeout callback as the terminal signal.",
  ],
  accountBalance: [
    "This route requests the official balance snapshot for the configured shortcode.",
    "The dashboard layers later transaction deltas on top of the latest balance callback when available.",
  ],
};

const defaultErrors: ErrorRow[] = [
  { status: 401, code: "authentication_error", description: "Missing, unknown, disabled, or invalid access token." },
  { status: 403, code: "authorization_error", description: "The access token is valid but lacks the required operation scope." },
  { status: 422, code: "validation_error", description: "The request body failed schema validation or required gateway configuration is missing." },
  { status: 502, code: "mpesa_request_failed", description: "Safaricom rejected the upstream request or returned an operational failure." },
];

function getOperation(
  operationMap: Map<MpesaOperation, OperationDefinition>,
  operationId: MpesaOperation,
) {
  const operation = operationMap.get(operationId);
  if (!operation) {
    throw new Error(`Missing operation definition for ${operationId}`);
  }

  return operation;
}

function relatedCallbacks(operationId: MpesaOperation, config: GatewayConfig) {
  return callbackDocs
    .filter((item) => item.operations.includes(operationId))
    .map((item) => ({
      ...item,
      url: config.callbackUrls[item.key],
      legacyUrl: config.legacyCallbackUrls[item.key],
    }));
}

function isJsonField(operationId: MpesaOperation, fieldName: string) {
  const operation = operationCatalog.find((item) => item.id === operationId);
  const field = operation?.fields.find((item) => item.name === fieldName);
  return field?.valueFormat === "json";
}

function exampleValue(operationId: MpesaOperation, fieldName: string) {
  const samples: Partial<Record<MpesaOperation, Record<string, unknown>>> = {
    stkPush: {
      phoneNumber: "254712345678",
      amount: 1500,
      accountReference: "INV1001",
      transactionDesc: "UtilityBill",
      transactionType: "CustomerPayBillOnline",
    },
    stkQuery: {
      checkoutRequestId: "ws_CO_123456789",
    },
    c2bRegister: {
      responseType: "Completed",
    },
    c2bSimulate: {
      amount: 1500,
      phoneNumber: "254712345678",
      billRefNumber: "INV1001",
      commandId: "CustomerPayBillOnline",
      shortcode: "600000",
    },
    b2c: {
      phoneNumber: "254712345678",
      amount: 2500,
      remarks: "Agent payout",
      commandId: "BusinessPayment",
      occasion: "August settlement",
      originatorConversationId: "ops-payout-2026-08-31-01",
    },
    b2b: {
      receiverShortcode: "600999",
      amount: 5000,
      remarks: "Settlement transfer",
      commandId: "BusinessPayBill",
      accountReference: "SETTLE1001",
      senderIdentifierType: "4",
      receiverIdentifierType: "4",
    },
    businessToPochi: {
      phoneNumber: "254712345678",
      amount: 1200,
      remarks: "Merchant cashout",
      commandId: "BusinessPayToPochi",
      occasion: "Field refund",
      originatorConversationId: "pochi-2026-08-31-01",
    },
    transactionStatus: {
      transactionId: "OEI2AK4Q16",
      remarks: "Transaction status query",
      occasion: "Support investigation",
      identifierType: "4",
      commandId: "TransactionStatusQuery",
    },
    reversal: {
      transactionId: "OEI2AK4Q16",
      amount: 1500,
      remarks: "Customer refund",
      occasion: "Duplicate charge",
      receiverParty: "174379",
      receiverIdentifierType: "11",
      commandId: "TransactionReversal",
    },
    accountBalance: {
      remarks: "Account balance query",
      identifierType: "4",
      commandId: "AccountBalance",
    },
  };

  return samples[operationId]?.[fieldName];
}

function buildExampleRequest(operation: OperationDefinition) {
  if (operation.method === "GET") {
    return null;
  }

  const body: Record<string, unknown> = {};

  for (const field of operation.fields) {
    const value = exampleValue(operation.id, field.name);
    if (value !== undefined) {
      body[field.name] = value;
      continue;
    }

    if (field.type === "number") {
      body[field.name] = 1;
      continue;
    }

    body[field.name] = isJsonField(operation.id, field.name) ? {} : `sample-${field.name}`;
  }

  return body;
}

function inferStatus(operationId: MpesaOperation) {
  if (operationId === "stkPush") {
    return "pending";
  }

  if (
    operationId === "b2c" ||
    operationId === "b2b" ||
    operationId === "businessToPochi" ||
    operationId === "transactionStatus" ||
    operationId === "reversal" ||
    operationId === "accountBalance"
  ) {
    return "accepted";
  }

  return "succeeded";
}

function buildExampleResponse(operation: OperationDefinition) {
  const common = {
    success: true,
    provider: "mpesa",
    operation: operation.id,
    requestId: "req_01j6-demo",
    timestamp: "2026-08-31T11:45:00.000Z",
    status: inferStatus(operation.id),
    httpStatus: operation.id === "stkPush" ? 202 : 200,
  };

  switch (operation.id) {
    case "stkPush":
      return {
        ...common,
        data: {
          ResponseCode: "0",
          ResponseDescription: "Success. Request accepted for processing",
          MerchantRequestID: "29115-34620561-1",
          CheckoutRequestID: "ws_CO_123456789",
        },
        upstream: {
          httpStatus: 200,
          requestId: "29115-34620561-1",
          responseCode: "0",
          responseDescription: "Success. Request accepted for processing",
        },
        meta: {
          applicationId: "app_live",
          idempotencyKey: "stk-20260831-1001",
          latencyMs: 321,
        },
      };
    case "b2c":
    case "b2b":
    case "businessToPochi":
    case "transactionStatus":
    case "reversal":
    case "accountBalance":
      return {
        ...common,
        data: {
          ResponseCode: "0",
          ResponseDescription: "Accept the service request successfully.",
          ConversationID: "AG_20260831_123456789abc",
          OriginatorConversationID: "ops-reference-1001",
        },
        upstream: {
          httpStatus: 200,
          conversationId: "AG_20260831_123456789abc",
          originatorConversationId: "ops-reference-1001",
          responseCode: "0",
          responseDescription: "Accept the service request successfully.",
        },
        meta: {
          applicationId: "app_live",
          ...(operation.moneyMoving ? { idempotencyKey: "moneyflow-20260831-1001" } : {}),
          latencyMs: 290,
        },
      };
    default:
      return {
        ...common,
        data: {
          ResponseCode: "0",
          ResponseDescription: "Accepted",
        },
        upstream: {
          httpStatus: 200,
          responseCode: "0",
          responseDescription: "Accepted",
        },
        meta: {
          applicationId: "app_live",
          latencyMs: 190,
        },
      };
  }
}

function buildCurlExample(operation: OperationDefinition, baseUrl: string) {
  const lines = [
    `curl -X ${operation.method} "${baseUrl}${operation.route}"`,
    '  -H "Authorization: Bearer zd_live_replace_with_token"',
  ];

  if (operation.method !== "GET") {
    lines.push('  -H "Content-Type: application/json"');
  }

  if (operation.moneyMoving) {
    lines.push('  -H "Idempotency-Key: moneyflow-20260831-1001"');
  }

  const request = buildExampleRequest(operation);
  if (request) {
    lines.push(`  --data-raw '${JSON.stringify(request, null, 2)}'`);
  }

  return lines.join(" \\\n");
}

function buildNodeExample(operation: OperationDefinition, baseUrl: string) {
  const request = buildExampleRequest(operation);
  const lines = [
    `const response = await fetch("${baseUrl}${operation.route}", {`,
    `  method: "${operation.method}",`,
    "  headers: {",
    '    "Content-Type": "application/json",',
    '    "Authorization": "Bearer zd_live_replace_with_token",',
    ...(operation.moneyMoving ? ['    "Idempotency-Key": "moneyflow-20260831-1001",'] : []),
    "  },",
    ...(request ? [`  body: JSON.stringify(${JSON.stringify(request, null, 2)}),`] : []),
    "});",
    "",
    "const data = await response.json();",
    "console.log(response.status, data);",
  ];

  return lines.join("\n");
}

function buildStoredStatusCurlExample(baseUrl: string) {
  return [
    `curl "${baseUrl}/api/mpesa/transactions/status?checkoutRequestId=ws_CO_123456789"`,
    '  -H "Authorization: Bearer zd_live_replace_with_token"',
  ].join(" \\\n");
}

function buildStoredStatusNodeExample(baseUrl: string) {
  return [
    `const url = new URL("${baseUrl}/api/mpesa/transactions/status");`,
    'url.searchParams.set("checkoutRequestId", "ws_CO_123456789");',
    "",
    "const response = await fetch(url, {",
    '  headers: {',
    '    "Authorization": "Bearer zd_live_replace_with_token",',
    "  },",
    "});",
    "",
    "const data = await response.json();",
    "console.log(data.transaction);",
  ].join("\n");
}

function buildStoredStatusResponseExample() {
  return JSON.stringify(
    {
      success: true,
      transaction: {
        id: "req_01j6-demo",
        requestId: "req_01j6-demo",
        checkoutRequestId: "ws_CO_123456789",
        transactionId: "UHT0U45KSB",
        status: "succeeded",
        amount: 1500,
        accountReference: "INV1001",
        createdAt: "2026-08-31T11:45:00.000Z",
        updatedAt: "2026-08-31T11:47:12.000Z",
      },
    },
    null,
    2,
  );
}

function buildErrorExample(operation: MpesaOperation) {
  return JSON.stringify(
    {
      success: false,
      provider: "mpesa",
      operation,
      requestId: "req_01j6-failed",
      timestamp: "2026-08-31T11:46:00.000Z",
      status: "failed",
      httpStatus: 422,
      error: {
        code: "validation_error",
        message: "Request validation failed",
        details: {
          fields: [
            {
              path: "phoneNumber",
              message: "Required",
            },
          ],
        },
      },
      meta: {
        applicationId: "app_live",
        latencyMs: 8,
      },
    },
    null,
    2,
  );
}

function buildStkWebhookExample() {
  return JSON.stringify(
    {
      Body: {
        stkCallback: {
          MerchantRequestID: "29115-34620561-1",
          CheckoutRequestID: "ws_CO_123456789",
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully.",
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 1500 },
              { Name: "MpesaReceiptNumber", Value: "UHT0U45KSB" },
              { Name: "TransactionDate", Value: 20260831114712 },
              { Name: "PhoneNumber", Value: 254712345678 },
            ],
          },
        },
      },
    },
    null,
    2,
  );
}

function buildTreasuryWebhookExample(kind: "b2c" | "b2b" | "transactionStatus" | "reversal" | "accountBalance") {
  const result =
    kind === "accountBalance"
      ? {
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully.",
          OriginatorConversationID: "ops-reference-1001",
          ConversationID: "AG_20260831_123456789abc",
          ResultParameters: {
            ResultParameter: [
              { Key: "AccountBalance", Value: "Working Account|KES|32500.00|32500.00" },
            ],
          },
        }
      : kind === "transactionStatus"
        ? {
            ResultCode: 0,
            ResultDesc: "The service request is processed successfully.",
            OriginatorConversationID: "ops-reference-1001",
            ConversationID: "AG_20260831_123456789abc",
            TransactionID: "OEI2AK4Q16",
            ResultParameters: {
              ResultParameter: [{ Key: "TransactionStatus", Value: "Completed" }],
            },
          }
        : kind === "reversal"
          ? {
              ResultCode: 0,
              ResultDesc: "The service request is processed successfully.",
              OriginatorConversationID: "ops-reference-1001",
              ConversationID: "AG_20260831_123456789abc",
              TransactionID: "OEI2AK4Q16",
              ResultParameters: {
                ResultParameter: [{ Key: "TransactionReceipt", Value: "UHT0U45KSB" }],
              },
            }
          : {
              ResultCode: 0,
              ResultDesc: "The service request is processed successfully.",
              OriginatorConversationID: "ops-reference-1001",
              ConversationID: "AG_20260831_123456789abc",
              TransactionID: "QDG7X9ZC22",
              ResultParameters: {
                ResultParameter: [{ Key: "TransactionReceipt", Value: "QDG7X9ZC22" }],
              },
            };

  return JSON.stringify({ Result: result }, null, 2);
}

function buildC2bConfirmationExample() {
  return JSON.stringify(
    {
      TransID: "UHT0U45KSB",
      TransAmount: "1500.00",
      BillRefNumber: "INV1001",
      MSISDN: "254712345678",
      BusinessShortCode: "174379",
    },
    null,
    2,
  );
}

const sectionFrameClass =
  "overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/96 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)] ring-1 ring-white/70 backdrop-blur sm:p-8";
const insetCardClass =
  "rounded-[1.55rem] border border-slate-200/85 bg-[#f9fbfd] p-5 shadow-[0_10px_26px_rgba(15,23,42,0.04)]";
const elevatedCardClass =
  "rounded-[1.55rem] border border-slate-200/85 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.06)]";
const tableWrapClass =
  "overflow-hidden rounded-[1.45rem] border border-slate-200/90 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]";
const eyebrowClass = "text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500";

function methodBadgeClass(method: EndpointDoc["method"]) {
  return method === "POST"
    ? "bg-sky-100 text-sky-900 ring-1 ring-sky-200"
    : "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200";
}

function statusBadgeClass(label: string) {
  if (label === "succeeded") {
    return "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200";
  }

  if (label === "pending" || label === "accepted") {
    return "bg-sky-100 text-sky-900 ring-1 ring-sky-200";
  }

  if (label === "cancelled" || label === "timeout") {
    return "bg-amber-100 text-amber-900 ring-1 ring-amber-200";
  }

  return "bg-rose-100 text-rose-900 ring-1 ring-rose-200";
}

function renderParameterTable(parameters: EndpointDoc["parameters"]) {
  return (
    <div className={tableWrapClass}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50/90 text-[11px] uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-4 py-3.5">Field</th>
              <th className="px-4 py-3.5">Type</th>
              <th className="px-4 py-3.5">Required</th>
              <th className="px-4 py-3.5">Details</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {parameters.map((parameter) => (
              <tr key={parameter.name} className="border-t border-slate-200/80 align-top transition hover:bg-slate-50/70">
                <td className="mono px-4 py-3.5 text-slate-950">{parameter.name}</td>
                <td className="px-4 py-3.5 text-slate-600">{parameter.type}</td>
                <td className="px-4 py-3.5 text-slate-600">{parameter.required ? "Yes" : "Optional"}</td>
                <td className="px-4 py-3.5 text-slate-600">
                  {parameter.description}
                  {parameter.defaultValue ? (
                    <span className="mt-1 block text-slate-500">Default: {parameter.defaultValue}</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EndpointArticle({ doc }: { doc: EndpointDoc }) {
  const detailPills = [
    `${doc.parameters.length} parameter${doc.parameters.length === 1 ? "" : "s"}`,
    `${doc.errors.length} documented error${doc.errors.length === 1 ? "" : "s"}`,
    doc.webhook ? "Asynchronous completion" : "Immediate completion",
  ];

  return (
    <section className={sectionFrameClass}>
      <div className="grid gap-6 border-b border-slate-200/80 pb-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="min-w-0">
          <div className={eyebrowClass}>Endpoint reference</div>
          <DocHeading as="h2" id={doc.id} className="mt-4 text-3xl font-semibold tracking-[-0.055em] sm:text-[2.15rem]">
            {doc.title}
          </DocHeading>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${methodBadgeClass(doc.method)}`}>
              {doc.method}
            </span>
            <code className="mono rounded-full border border-slate-300/90 bg-white px-3 py-1 text-xs text-slate-700 shadow-[0_6px_16px_rgba(15,23,42,0.05)]">
              {doc.route}
            </code>
          </div>
          <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-600 sm:text-base">{doc.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {detailPills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-600"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>

        <div className="min-w-0 rounded-[1.7rem] border border-[#1b2f4a] bg-[linear-gradient(160deg,#0b1524_0%,#0f2035_100%)] p-5 text-white shadow-[0_22px_50px_rgba(10,20,34,0.28)]">
          <div className="text-[11px] uppercase tracking-[0.18em] text-sky-200/80">Request profile</div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Authentication</div>
              <div className="mt-2 text-sm leading-7 text-slate-100">Bearer token with operation scope enforcement.</div>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Completion model</div>
              <div className="mt-2 text-sm leading-7 text-slate-100">
                {doc.webhook
                  ? doc.webhook.callbackLabel ?? "Terminal state arrives through the callback rail."
                  : "Request completes in the immediate HTTP response."}
              </div>
            </div>
            <div className="rounded-[1.2rem] border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-slate-400">Operational note</div>
              <div className="mt-2 text-sm leading-7 text-slate-100">
                {doc.notes?.[0] ??
                  "Persist request identifiers from the immediate response so support and reconciliation stay straightforward."}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
        <div className="min-w-0 space-y-6">
          <div className={insetCardClass}>
            <div className={eyebrowClass}>Authentication</div>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
              {doc.authentication.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className={`mb-3 ${eyebrowClass}`}>Request parameters</div>
            {renderParameterTable(doc.parameters)}
          </div>

          {doc.notes?.length ? (
            <div className={insetCardClass}>
              <div className={eyebrowClass}>Implementation notes</div>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                {doc.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={insetCardClass}>
            <div className={eyebrowClass}>
              {doc.statusHeading ?? "Possible statuses"}
            </div>
            <div className="mt-4 space-y-3">
              {doc.statuses.map((status) => (
                <div key={status.label} className={elevatedCardClass}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${statusBadgeClass(status.label)}`}>
                      {status.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{status.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={insetCardClass}>
            <div className={eyebrowClass}>Error responses</div>
            <div className="mt-4 space-y-3">
              {doc.errors.map((error) => (
                <div key={`${error.status}-${error.code}`} className={elevatedCardClass}>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="mono text-sm text-slate-950">{error.status}</span>
                    <span className="mono rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
                      {error.code}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{error.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <DocsCodeTabs
            title="Request example"
            description="Use cURL or Node.js against the public Zadhron route. For money-moving calls, send a stable Idempotency-Key."
            tabs={doc.requestExamples}
          />
          <DocsCodeTabs
            title="Immediate response"
            description="This is the HTTP response returned by Zadhron as soon as the gateway has processed the request."
            tabs={doc.immediateResponse}
          />
          {doc.webhook ? (
            <DocsCodeTabs
              title="Asynchronous callback example"
              description={`${doc.webhook.description}${doc.webhook.callbackUrl ? ` Callback URL: ${doc.webhook.callbackUrl}` : ""}`}
              tabs={doc.webhook.examples}
            />
          ) : null}
          <DocsCodeTabs
            title="Normalized error example"
            description="Validation, authentication, authorization, and provider errors use the same envelope shape."
            tabs={[
              {
                label: "JSON",
                language: "json",
                tone: "response",
                code: buildErrorExample("stkPush"),
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function createEndpointDocs(
  config: GatewayConfig,
  operationMap: Map<MpesaOperation, OperationDefinition>,
): EndpointDoc[] {
  const stkPush = getOperation(operationMap, "stkPush");
  const stkQuery = getOperation(operationMap, "stkQuery");
  const b2c = getOperation(operationMap, "b2c");
  const b2b = getOperation(operationMap, "b2b");
  const businessToPochi = getOperation(operationMap, "businessToPochi");
  const transactionStatus = getOperation(operationMap, "transactionStatus");
  const reversal = getOperation(operationMap, "reversal");
  const accountBalance = getOperation(operationMap, "accountBalance");

  return [
    {
      id: "stk-push",
      title: "STK Push",
      method: stkPush.method,
      route: stkPush.route,
      description:
        "Initiate a handset prompt for a customer payment. Zadhron normalizes the request and response, then waits for the terminal outcome to arrive through the STK callback rail.",
      authentication: [
        "Requires a merchant access token in the Authorization header.",
        "The token must be allowed to call the stkPush operation.",
        "Send Idempotency-Key on retryable collection requests so duplicate prompts do not fan out after transport uncertainty.",
      ],
      parameters: stkPush.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required,
        description: field.description,
        defaultValue: field.name === "transactionType" ? "CustomerPayBillOnline" : undefined,
      })),
      requestExamples: [
        { label: "cURL", language: "bash", tone: "request", code: buildCurlExample(stkPush, config.callbackBaseUrl) },
        { label: "Node.js", language: "javascript", tone: "request", code: buildNodeExample(stkPush, config.callbackBaseUrl) },
      ],
      immediateResponse: [
        { label: "JSON", language: "json", tone: "response", code: JSON.stringify(buildExampleResponse(stkPush), null, 2) },
      ],
      webhook: {
        description:
          "The final STK outcome arrives asynchronously. The callback payload may include nested CallbackMetadata items, including the receipt number and phone number.",
        callbackLabel: "STK callback",
        callbackUrl: config.callbackUrls.stk,
        examples: [{ label: "Callback payload", language: "json", tone: "webhook", code: buildStkWebhookExample() }],
      },
      statuses: [
        { label: "pending", description: "The request was accepted by Safaricom and the handset prompt is in flight." },
        { label: "succeeded", description: "The callback or a later STK query resolved the payment successfully." },
        { label: "cancelled", description: "The handset flow was cancelled, for example through ResultCode 1032." },
        { label: "failed", description: "The request was rejected upstream or the callback resolved to a non-success terminal state." },
      ],
      errors: [...defaultErrors, { status: 409, code: "conflict_error", description: "The supplied Idempotency-Key is already in use for a different payload or is still processing." }],
      notes: endpointNotes.stkPush,
    },
    {
      id: "stk-query",
      title: "STK Push Status / Query",
      method: stkQuery.method,
      route: stkQuery.route,
      description:
        "Query an existing STK request by CheckoutRequestID. This is the fastest recovery path when the initial request is still pending and the handset callback has not landed yet.",
      authentication: [
        "Requires a merchant access token in the Authorization header.",
        "The token must be allowed to call the stkQuery operation.",
      ],
      parameters: stkQuery.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required,
        description: field.description,
      })),
      requestExamples: [
        { label: "cURL", language: "bash", tone: "request", code: buildCurlExample(stkQuery, config.callbackBaseUrl) },
        { label: "Node.js", language: "javascript", tone: "request", code: buildNodeExample(stkQuery, config.callbackBaseUrl) },
      ],
      immediateResponse: [
        {
          label: "JSON",
          language: "json",
          tone: "response",
          code: JSON.stringify(
            {
              ...buildExampleResponse(stkQuery),
              data: {
                ResponseCode: "0",
                ResultCode: "0",
                ResultDesc: "The service request is processed successfully.",
                CheckoutRequestID: "ws_CO_123456789",
                MpesaReceiptNumber: "UHT0U45KSB",
              },
            },
            null,
            2,
          ),
        },
      ],
      statuses: [
        { label: "succeeded", description: "Safaricom returned a successful terminal status for the CheckoutRequestID." },
        { label: "cancelled", description: "The request resolved to a cancelled handset flow." },
        { label: "failed", description: "Safaricom returned a non-success terminal outcome or the query failed." },
      ],
      errors: defaultErrors,
      notes: endpointNotes.stkQuery,
    },
    {
      id: "b2c",
      title: "B2C",
      method: b2c.method,
      route: b2c.route,
      description:
        "Send funds from the configured organization shortcode to a customer wallet. The initial API response is only an acceptance signal; the terminal result is asynchronous.",
      authentication: [
        "Requires a merchant access token in the Authorization header.",
        "The token must be allowed to call the b2c operation.",
        "Send Idempotency-Key for retry safety on payout requests.",
      ],
      parameters: b2c.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required,
        description: field.description,
        defaultValue:
          field.name === "commandId"
            ? "BusinessPayment"
            : field.name === "occasion"
              ? '""'
              : undefined,
      })),
      requestExamples: [
        { label: "cURL", language: "bash", tone: "request", code: buildCurlExample(b2c, config.callbackBaseUrl) },
        { label: "Node.js", language: "javascript", tone: "request", code: buildNodeExample(b2c, config.callbackBaseUrl) },
      ],
      immediateResponse: [
        { label: "JSON", language: "json", tone: "response", code: JSON.stringify(buildExampleResponse(b2c), null, 2) },
      ],
      webhook: {
        description:
          "B2C completion is delivered asynchronously through the result and timeout callback pair.",
        callbackUrl: `${config.callbackUrls.b2cResult} and ${config.callbackUrls.b2cTimeout}`,
        examples: [{ label: "Result payload", language: "json", tone: "webhook", code: buildTreasuryWebhookExample("b2c") }],
      },
      statuses: [
        { label: "accepted", description: "Safaricom accepted the request into the payout queue." },
        { label: "succeeded", description: "The result callback resolved the payout successfully." },
        { label: "timeout", description: "The timeout callback reported queue expiry before completion." },
        { label: "failed", description: "The result callback or upstream request indicated failure." },
      ],
      errors: [...defaultErrors, { status: 409, code: "conflict_error", description: "Idempotency conflict or in-progress duplicate payout request." }],
      notes: endpointNotes.b2c,
    },
    {
      id: "b2b",
      title: "B2B",
      method: b2b.method,
      route: b2b.route,
      description:
        "Transfer funds between business shortcodes. Zadhron normalizes the acceptance response and tracks the final result through the B2B callback pair.",
      authentication: [
        "Requires a merchant access token in the Authorization header.",
        "The token must be allowed to call the b2b operation.",
        "Send Idempotency-Key for retry safety on transfer requests.",
      ],
      parameters: b2b.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required,
        description: field.description,
        defaultValue:
          field.name === "commandId"
            ? "BusinessPayBill"
            : field.name === "senderIdentifierType" || field.name === "receiverIdentifierType"
              ? "4"
              : undefined,
      })),
      requestExamples: [
        { label: "cURL", language: "bash", tone: "request", code: buildCurlExample(b2b, config.callbackBaseUrl) },
        { label: "Node.js", language: "javascript", tone: "request", code: buildNodeExample(b2b, config.callbackBaseUrl) },
      ],
      immediateResponse: [
        { label: "JSON", language: "json", tone: "response", code: JSON.stringify(buildExampleResponse(b2b), null, 2) },
      ],
      webhook: {
        description:
          "B2B completion is delivered asynchronously through the result and timeout callback pair.",
        callbackUrl: `${config.callbackUrls.b2bResult} and ${config.callbackUrls.b2bTimeout}`,
        examples: [{ label: "Result payload", language: "json", tone: "webhook", code: buildTreasuryWebhookExample("b2b") }],
      },
      statuses: [
        { label: "accepted", description: "Safaricom accepted the request into the B2B queue." },
        { label: "succeeded", description: "The result callback resolved the transfer successfully." },
        { label: "timeout", description: "The timeout callback reported queue expiry before completion." },
        { label: "failed", description: "The result callback or upstream request indicated failure." },
      ],
      errors: [...defaultErrors, { status: 409, code: "conflict_error", description: "Idempotency conflict or in-progress duplicate B2B request." }],
      notes: endpointNotes.b2b,
    },
    {
      id: "business-to-pochi",
      title: "Business to Pochi",
      method: businessToPochi.method,
      route: businessToPochi.route,
      description:
        "Use the B2Pochi product for merchant-to-wallet disbursement when Safaricom has enabled it for your shortcode. The terminal result arrives on the B2C callback rail in the current gateway implementation.",
      authentication: [
        "Requires a merchant access token in the Authorization header.",
        "The token must be allowed to call the businessToPochi operation.",
        "Send Idempotency-Key for retry safety on disbursement requests.",
      ],
      parameters: businessToPochi.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required,
        description: field.description,
        defaultValue:
          field.name === "commandId"
            ? "BusinessPayToPochi"
            : field.name === "occasion"
              ? '""'
              : undefined,
      })),
      requestExamples: [
        { label: "cURL", language: "bash", tone: "request", code: buildCurlExample(businessToPochi, config.callbackBaseUrl) },
        { label: "Node.js", language: "javascript", tone: "request", code: buildNodeExample(businessToPochi, config.callbackBaseUrl) },
      ],
      immediateResponse: [
        { label: "JSON", language: "json", tone: "response", code: JSON.stringify(buildExampleResponse(businessToPochi), null, 2) },
      ],
      webhook: {
        description:
          "Business to Pochi shares the B2C result and timeout callback URLs in the current implementation.",
        callbackUrl: `${config.callbackUrls.b2cResult} and ${config.callbackUrls.b2cTimeout}`,
        examples: [{ label: "Result payload", language: "json", tone: "webhook", code: buildTreasuryWebhookExample("b2c") }],
      },
      statuses: [
        { label: "accepted", description: "Safaricom accepted the request into the queue." },
        { label: "succeeded", description: "The B2C-style result callback resolved the disbursement successfully." },
        { label: "timeout", description: "The timeout callback reported queue expiry before completion." },
        { label: "failed", description: "The result callback or upstream request indicated failure." },
      ],
      errors: [...defaultErrors, { status: 409, code: "conflict_error", description: "Idempotency conflict or in-progress duplicate payout request." }],
      notes: endpointNotes.businessToPochi,
    },
    {
      id: "transaction-status",
      title: "Transaction Status",
      method: transactionStatus.method,
      route: transactionStatus.route,
      description:
        "Ask Safaricom for the status of an existing M-Pesa transaction. This is the provider-side query surface, distinct from Zadhron's own stored transaction lookup route.",
      authentication: [
        "Requires a merchant access token in the Authorization header.",
        "The token must be allowed to call the transactionStatus operation.",
      ],
      parameters: transactionStatus.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required,
        description: field.description,
        defaultValue:
          field.name === "identifierType"
            ? "4"
            : field.name === "commandId"
              ? "TransactionStatusQuery"
              : field.name === "remarks"
                ? "Transaction status query"
                : field.name === "occasion"
                  ? '""'
                  : undefined,
      })),
      requestExamples: [
        { label: "cURL", language: "bash", tone: "request", code: buildCurlExample(transactionStatus, config.callbackBaseUrl) },
        { label: "Node.js", language: "javascript", tone: "request", code: buildNodeExample(transactionStatus, config.callbackBaseUrl) },
      ],
      immediateResponse: [
        { label: "JSON", language: "json", tone: "response", code: JSON.stringify(buildExampleResponse(transactionStatus), null, 2) },
      ],
      webhook: {
        description:
          "The transaction-status query completes asynchronously through the result or timeout callback.",
        callbackUrl: `${config.callbackUrls.transactionStatusResult} and ${config.callbackUrls.transactionStatusTimeout}`,
        examples: [{ label: "Result payload", language: "json", tone: "webhook", code: buildTreasuryWebhookExample("transactionStatus") }],
      },
      statuses: [
        { label: "accepted", description: "Safaricom accepted the lookup request." },
        { label: "succeeded", description: "The result callback returned a successful terminal answer." },
        { label: "timeout", description: "The timeout callback reported queue expiry before completion." },
        { label: "failed", description: "The result callback or upstream request indicated failure." },
      ],
      errors: defaultErrors,
      notes: endpointNotes.transactionStatus,
    },
    {
      id: "reversal",
      title: "Reversal",
      method: reversal.method,
      route: reversal.route,
      description:
        "Request a reversal for an existing M-Pesa transaction. Treat the initial API response as acceptance only and wait for the asynchronous reversal result.",
      authentication: [
        "Requires a merchant access token in the Authorization header.",
        "The token must be allowed to call the reversal operation.",
        "Send Idempotency-Key for retry safety on reversal requests.",
      ],
      parameters: reversal.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required,
        description: field.description,
        defaultValue:
          field.name === "receiverIdentifierType"
            ? "11"
            : field.name === "commandId"
              ? "TransactionReversal"
              : field.name === "occasion"
                ? '""'
                : undefined,
      })),
      requestExamples: [
        { label: "cURL", language: "bash", tone: "request", code: buildCurlExample(reversal, config.callbackBaseUrl) },
        { label: "Node.js", language: "javascript", tone: "request", code: buildNodeExample(reversal, config.callbackBaseUrl) },
      ],
      immediateResponse: [
        { label: "JSON", language: "json", tone: "response", code: JSON.stringify(buildExampleResponse(reversal), null, 2) },
      ],
      webhook: {
        description:
          "Reversal completion is delivered asynchronously through the result and timeout callback pair.",
        callbackUrl: `${config.callbackUrls.reversalResult} and ${config.callbackUrls.reversalTimeout}`,
        examples: [{ label: "Result payload", language: "json", tone: "webhook", code: buildTreasuryWebhookExample("reversal") }],
      },
      statuses: [
        { label: "accepted", description: "Safaricom accepted the reversal request into its queue." },
        { label: "succeeded", description: "The result callback resolved the reversal successfully." },
        { label: "timeout", description: "The timeout callback reported queue expiry before completion." },
        { label: "failed", description: "The result callback or upstream request indicated failure." },
      ],
      errors: [...defaultErrors, { status: 409, code: "conflict_error", description: "Idempotency conflict or in-progress duplicate reversal request." }],
      notes: endpointNotes.reversal,
    },
    {
      id: "account-balance",
      title: "Account Balance",
      method: accountBalance.method,
      route: accountBalance.route,
      description:
        "Request the official balance snapshot for the configured shortcode. The terminal payload arrives through the account-balance result or timeout callback.",
      authentication: [
        "Requires a merchant access token in the Authorization header.",
        "The token must be allowed to call the accountBalance operation.",
      ],
      parameters: accountBalance.fields.map((field) => ({
        name: field.name,
        type: field.type,
        required: field.required,
        description: field.description,
        defaultValue:
          field.name === "identifierType"
            ? "4"
            : field.name === "commandId"
              ? "AccountBalance"
              : field.name === "remarks"
                ? "Account balance query"
                : undefined,
      })),
      requestExamples: [
        { label: "cURL", language: "bash", tone: "request", code: buildCurlExample(accountBalance, config.callbackBaseUrl) },
        { label: "Node.js", language: "javascript", tone: "request", code: buildNodeExample(accountBalance, config.callbackBaseUrl) },
      ],
      immediateResponse: [
        { label: "JSON", language: "json", tone: "response", code: JSON.stringify(buildExampleResponse(accountBalance), null, 2) },
      ],
      webhook: {
        description:
          "Account balance completion is delivered asynchronously through the result and timeout callback pair.",
        callbackUrl: `${config.callbackUrls.accountBalanceResult} and ${config.callbackUrls.accountBalanceTimeout}`,
        examples: [{ label: "Result payload", language: "json", tone: "webhook", code: buildTreasuryWebhookExample("accountBalance") }],
      },
      statuses: [
        { label: "accepted", description: "Safaricom accepted the balance request into its queue." },
        { label: "succeeded", description: "The result callback returned the official balance snapshot." },
        { label: "timeout", description: "The timeout callback reported queue expiry before completion." },
        { label: "failed", description: "The result callback or upstream request indicated failure." },
      ],
      errors: defaultErrors,
      notes: endpointNotes.accountBalance,
    },
  ];
}

export function DeveloperDocs({ config, operations }: Props) {
  const operationMap = new Map(operations.map((operation) => [operation.id, operation] as const));
  const endpointDocs = createEndpointDocs(config, operationMap);
  const additionalOperations = operations.filter(
    (operation) =>
      ![
        "stkPush",
        "stkQuery",
        "c2bRegister",
        "c2bSimulate",
        "b2c",
        "b2b",
        "businessToPochi",
        "transactionStatus",
        "reversal",
        "accountBalance",
      ].includes(operation.id),
  );

  const sidebar: DocsSidebarSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      items: [
        { id: "introduction", label: "Introduction" },
        { id: "quick-start", label: "Quick Start" },
        { id: "authentication", label: "Authentication" },
        { id: "environments", label: "Environments" },
        { id: "api-keys", label: "API Keys" },
      ],
    },
    {
      id: "accept-payments",
      title: "Accept Payments",
      items: [
        { id: "stk-push", label: "STK Push" },
        { id: "stk-query", label: "STK Push Status / Query" },
        { id: "c2b", label: "C2B" },
      ],
    },
    {
      id: "send-payments",
      title: "Send Payments",
      items: [
        { id: "b2c", label: "B2C" },
        { id: "b2b", label: "B2B" },
        { id: "business-to-pochi", label: "Business to Pochi" },
      ],
    },
    {
      id: "transaction-management",
      title: "Transaction Management",
      items: [
        { id: "transaction-record-lookup", label: "Transaction Lookup" },
        { id: "transaction-status", label: "Transaction Status" },
        { id: "reversal", label: "Reversals" },
        { id: "account-balance", label: "Account Balance" },
      ],
    },
    {
      id: "webhooks",
      title: "Webhooks",
      items: [
        {
          label: "Webhook docs",
          children: [
            { id: "webhooks-overview", label: "Overview" },
            { id: "webhook-configuration", label: "Configuring a webhook" },
            { id: "webhook-event-types", label: "Event types" },
            { id: "webhook-signatures", label: "Signature verification", planned: true },
            { id: "webhook-retries", label: "Retries and failures" },
          ],
        },
      ],
    },
    {
      id: "api-reference",
      title: "API Reference",
      items: [
        { id: "api-reference-requests", label: "Requests" },
        { id: "api-reference-responses", label: "Responses" },
        { id: "api-reference-errors", label: "Error format" },
        { id: "api-reference-idempotency", label: "Idempotency" },
        { id: "api-reference-http-status", label: "HTTP status codes" },
      ],
    },
    {
      id: "additional",
      title: "Additional",
      items: [
        { id: "additional-operations", label: "Additional operations" },
        { id: "changelog", label: "Changelog", planned: true },
      ],
    },
  ];

  const toc: DocsTocItem[] = [
    { id: "introduction", label: "Introduction", level: 2 },
    { id: "quick-start", label: "Quick Start", level: 2 },
    { id: "authentication", label: "Authentication", level: 2 },
    { id: "environments", label: "Environments", level: 2 },
    { id: "api-keys", label: "API Keys", level: 2 },
    { id: "stk-push", label: "STK Push", level: 2 },
    { id: "stk-query", label: "STK Push Status / Query", level: 2 },
    { id: "c2b", label: "C2B", level: 2 },
    { id: "b2c", label: "B2C", level: 2 },
    { id: "b2b", label: "B2B", level: 2 },
    { id: "business-to-pochi", label: "Business to Pochi", level: 2 },
    { id: "transaction-record-lookup", label: "Transaction Lookup", level: 2 },
    { id: "transaction-status", label: "Transaction Status", level: 2 },
    { id: "reversal", label: "Reversal", level: 2 },
    { id: "account-balance", label: "Account Balance", level: 2 },
    { id: "webhooks-overview", label: "Webhooks Overview", level: 2 },
    { id: "webhook-configuration", label: "Configuring a webhook", level: 2 },
    { id: "webhook-event-types", label: "Event types", level: 2 },
    { id: "webhook-signatures", label: "Signature verification", level: 2 },
    { id: "webhook-retries", label: "Retries and failures", level: 2 },
    { id: "api-reference-requests", label: "Requests", level: 2 },
    { id: "api-reference-responses", label: "Responses", level: 2 },
    { id: "api-reference-errors", label: "Error format", level: 2 },
    { id: "api-reference-idempotency", label: "Idempotency", level: 2 },
    { id: "api-reference-http-status", label: "HTTP status codes", level: 2 },
    { id: "additional-operations", label: "Additional operations", level: 2 },
    { id: "changelog", label: "Changelog", level: 2 },
  ];

  const storedStatusDoc: EndpointDoc = {
    id: "transaction-record-lookup",
    title: "Stored Transaction Lookup",
    method: "GET",
    route: "/api/mpesa/transactions/status",
    description:
      "Read the latest Zadhron-known status for a previously created transaction by requestId, checkoutRequestId, idempotencyKey, or accountReference. This route returns Zadhron's stored record, not a live Safaricom query.",
    authentication: [
      "Requires a merchant access token in the Authorization header.",
      "The current implementation authenticates this route using the same bearer-token auth layer as STK Push access.",
      "Provide one of requestId, checkoutRequestId, idempotencyKey, or accountReference as a query parameter.",
    ],
    parameters: [
      { name: "requestId", type: "query", required: false, description: "Original Zadhron requestId returned in the normalized response." },
      { name: "checkoutRequestId", type: "query", required: false, description: "Earlier CheckoutRequestID returned by STK Push." },
      { name: "idempotencyKey", type: "query", required: false, description: "Idempotency-Key used on the original request." },
      { name: "accountReference", type: "query", required: false, description: "Your earlier reference value, when stored on the transaction." },
    ],
    requestExamples: [
      { label: "cURL", language: "bash", tone: "request", code: buildStoredStatusCurlExample(config.callbackBaseUrl) },
      { label: "Node.js", language: "javascript", tone: "request", code: buildStoredStatusNodeExample(config.callbackBaseUrl) },
    ],
    immediateResponse: [
      { label: "JSON", language: "json", tone: "response", code: buildStoredStatusResponseExample() },
    ],
    statuses: [
      { label: "pending", description: "The transaction exists, but Zadhron has not received a terminal callback yet." },
      { label: "accepted", description: "The provider accepted an asynchronous operation and a callback is still pending." },
      { label: "succeeded", description: "A terminal success callback or reconciliation result has been stored." },
      { label: "failed", description: "A terminal failure callback or failed upstream request has been stored." },
      { label: "cancelled", description: "The transaction reached a cancelled terminal state." },
      { label: "timeout", description: "A timeout callback was stored for the operation." },
    ],
    errors: [
      { status: 400, code: "bad_request", description: "No supported lookup parameter was provided." },
      { status: 401, code: "authentication_error", description: "The supplied access token was rejected." },
      { status: 404, code: "not_found", description: "No stored transaction matched the supplied lookup value for this token context." },
      { status: 500, code: "internal_error", description: "The transaction store could not be read." },
    ],
  };

  const documentedRouteCount = endpointDocs.length + 3;
  const asyncRouteCount = endpointDocs.filter((doc) => doc.webhook).length + 1;
  const callbackRailCount = callbackDocs.length;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(187,215,249,0.36),transparent_24%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.8),transparent_32%),linear-gradient(180deg,#f2f5f8_0%,#f7f9fc_22%,#eef2f7_100%)] text-slate-950">
      <DeveloperDocsShell sidebar={sidebar} toc={toc}>
        <div className="space-y-8">
          <section className="overflow-hidden rounded-[2.5rem] border border-slate-200/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.08)] ring-1 ring-white/70">
            <div className="grid gap-0 lg:grid-cols-[1.16fr_0.84fr]">
              <div className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),linear-gradient(135deg,#091322_0%,#0c1c31_52%,#12304f_100%)] px-6 py-8 text-white sm:px-8 sm:py-10 lg:border-b-0 lg:border-r">
                <div className="max-w-4xl">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">Zadhron Payments</div>
                  <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.065em] sm:text-[3.35rem] sm:leading-[1.02]">
                    Developer docs for the live M-Pesa gateway surface.
                  </h1>
                  <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-200 sm:text-base">
                    This page documents the current implementation as of September 2, 2026: bearer-token authentication,
                    normalized request and response envelopes, STK collection flows, treasury operations, provider callbacks,
                    and stored transaction lookup.
                  </p>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <a
                      href="#quick-start"
                      style={{ color: "#08111a" }}
                      className="rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-950 shadow-[0_16px_40px_rgba(255,255,255,0.14)] transition duration-200 hover:-translate-y-px hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                    >
                      Start integrating
                    </a>
                    <a
                      href="#api-reference-requests"
                      className="rounded-full border border-white/15 bg-white/[0.03] px-5 py-3 text-sm text-white transition duration-200 hover:-translate-y-px hover:bg-white/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                    >
                      Request contract
                    </a>
                  </div>
                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                      <div className="mono text-2xl text-white">{documentedRouteCount}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">Documented routes</div>
                    </div>
                    <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                      <div className="mono text-2xl text-white">{asyncRouteCount}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">Async flows</div>
                    </div>
                    <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 backdrop-blur">
                      <div className="mono text-2xl text-white">{callbackRailCount}</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-300">Callback rails</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[linear-gradient(180deg,#f8fbff_0%,#f2f6fb_100%)] px-6 py-8 sm:px-8 sm:py-10">
                <div className={eyebrowClass}>What to expect</div>
                <div className="mt-4 space-y-3">
                  {[
                    "Generate a merchant token and keep it server-side.",
                    "Call a normalized Zadhron route such as STK Push or B2C.",
                    "Persist requestId plus provider identifiers from the first response.",
                    "Resolve the terminal state through callbacks or a query path.",
                  ].map((step, index) => (
                    <div key={step} className="flex gap-4 rounded-[1.4rem] border border-slate-200/85 bg-white/90 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                      <div className="mono flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0f2035] text-sm text-white">
                        0{index + 1}
                      </div>
                      <p className="pt-1 text-sm leading-7 text-slate-700">{step}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-5 rounded-[1.5rem] border border-slate-200/90 bg-[#0f2035] p-5 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-sky-200/80">Primary integration model</div>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    Build around normalized fields such as <code className="mono rounded bg-white/10 px-1.5 py-0.5 text-xs">requestId</code> and
                    <code className="mono rounded bg-white/10 px-1.5 py-0.5 text-xs">status</code>. Safaricom identifiers still pass through,
                    but they are secondary to the gateway contract.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t border-slate-200/80 bg-white px-6 py-6 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div className={insetCardClass}>
                <DocHeading as="h2" id="introduction" className="text-[1.85rem] font-semibold tracking-[-0.05em]">
                  Introduction
                </DocHeading>
                <p className="mt-4 text-sm leading-8 text-slate-600">
                  Zadhron Payments exposes a single authenticated HTTP surface in front of Safaricom M-Pesa operations.
                  Developers can initiate STK Push requests, register or simulate C2B, send payouts with B2C, B2B,
                  and Business to Pochi, query transaction state, request reversals, and receive asynchronous Safaricom
                  callbacks through stable Zadhron routes.
                </p>
                <p className="mt-4 text-sm leading-8 text-slate-600">
                  The public API is organized around normalized fields such as <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">requestId</code>,
                  <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">status</code>, and bearer-token authentication.
                  Safaricom-specific identifiers such as <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">CheckoutRequestID</code>,
                  <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">ConversationID</code>, and receipt numbers are preserved when relevant,
                  but they are not the primary integration model.
                </p>
              </div>

              <div className="rounded-[1.6rem] border border-slate-200/90 bg-[linear-gradient(180deg,#f9fbff_0%,#eef4fb_100%)] p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className={eyebrowClass}>Core surfaces</div>
                <div className="mt-4 grid gap-3">
                  <div className="rounded-[1.2rem] border border-slate-200 bg-white/90 p-4">
                    <div className="text-sm font-semibold text-slate-950">Collect</div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">STK Push and C2B cover handset prompts, registration, and simulation.</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-white/90 p-4">
                    <div className="text-sm font-semibold text-slate-950">Disburse</div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">B2C, B2B, and Business to Pochi expose treasury rails with normalized responses.</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-slate-200 bg-white/90 p-4">
                    <div className="text-sm font-semibold text-slate-950">Recover and reconcile</div>
                    <p className="mt-2 text-sm leading-7 text-slate-600">Use STK Query, provider-side status checks, and stored transaction lookup when the first response is not final.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="quick-start" className="text-3xl font-semibold tracking-[-0.05em]">
              Quick Start
            </DocHeading>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              The shortest accurate path through the current gateway is:
            </p>
            <div className="mt-6 rounded-[1.6rem] border border-slate-200 bg-[#f8fbff] p-5">
              <div className="mono text-sm leading-8 text-slate-900">
                Create account or operator setup → Generate merchant access token → Make API request → Receive immediate normalized response → Zadhron forwards to M-Pesa → Receive Safaricom callback or query transaction state
              </div>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">Immediate response</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Save <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">requestId</code>, the normalized
                  <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">status</code>, and upstream ids such as
                  <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">CheckoutRequestID</code> or
                  <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">ConversationID</code>.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">Asynchronous outcome</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  STK Push, B2C, B2B, Business to Pochi, transaction status, reversal, and account balance all complete later through callbacks.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">Recovery path</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Use STK Query for handset flows and the stored transaction lookup route for the latest Zadhron-known transaction state.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <section className={sectionFrameClass}>
              <DocHeading as="h2" id="authentication" className="text-3xl font-semibold tracking-[-0.05em]">
                Authentication
              </DocHeading>
              <p className="mt-4 text-sm leading-8 text-slate-600">
                Every public M-Pesa route uses bearer-token authentication. Send the merchant token in the standard
                <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs"> Authorization: Bearer &lt;access-token&gt;</code>
                header.
              </p>
              <div className="mt-6 space-y-3 rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5 text-sm text-slate-700">
                <div><code className="mono text-slate-950">Authorization: Bearer &lt;access-token&gt;</code>: authenticates the merchant request</div>
                <div><code className="mono text-slate-950">Content-Type: application/json</code>: required for JSON request bodies</div>
                <div><code className="mono text-slate-950">Idempotency-Key</code>: optional, but recommended for money-moving routes</div>
              </div>
              <ul className="mt-6 space-y-3 text-sm leading-7 text-slate-600">
                <li>Access tokens are generated from the merchant dashboard and the raw token is only shown once at creation time.</li>
                <li>Authorization is scope-based and each scope maps to an operation id such as <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">stkPush</code> or <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">b2c</code>.</li>
                <li>A wildcard <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">*</code> scope also passes authorization.</li>
                <li>Store tokens server-side and do not embed them in browser code, mobile bundles, or public repositories.</li>
              </ul>
            </section>

            <section className={sectionFrameClass}>
              <DocHeading as="h2" id="environments" className="text-3xl font-semibold tracking-[-0.05em]">
                Environments
              </DocHeading>
              <p className="mt-4 text-sm leading-8 text-slate-600">
                The public Zadhron routes stay stable per deployment. The upstream Safaricom environment is selected
                internally through <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">MPESA_ENVIRONMENT</code>.
              </p>
              <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Setting</th>
                      <th className="px-4 py-3">Upstream base URL</th>
                      <th className="px-4 py-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    <tr className="border-t border-slate-200">
                      <td className="mono px-4 py-3 text-slate-950">sandbox</td>
                      <td className="mono px-4 py-3 text-slate-600">https://sandbox.safaricom.co.ke</td>
                      <td className="px-4 py-3 text-slate-600">Use for development, callback testing, and C2B simulation.</td>
                    </tr>
                    <tr className="border-t border-slate-200">
                      <td className="mono px-4 py-3 text-slate-950">production</td>
                      <td className="mono px-4 py-3 text-slate-600">https://api.safaricom.co.ke</td>
                      <td className="px-4 py-3 text-slate-600">Maps to live transaction storage semantics inside the database layer.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-5 text-sm leading-7 text-slate-600">
                Callback URLs are composed from <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">MPESA_CALLBACK_BASE_URL</code> or
                <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">PUBLIC_BASE_URL</code>, with optional per-callback overrides when needed.
              </p>
            </section>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="api-keys" className="text-3xl font-semibold tracking-[-0.05em]">
              API Keys
            </DocHeading>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              The broader Zadhron product has a merchant API keys data model and dashboard surface, but the
              current public M-Pesa gateway implementation authenticates requests with configured applications from
              <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">GATEWAY_APPLICATIONS_JSON</code>.
            </p>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">Implemented today</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Provision an application id, secret, scopes, enabled state, and optional rate limit in gateway configuration.
                  Public route auth checks these values directly at request time.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-semibold text-slate-950">Merchant self-service keys</div>
                  <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Planned
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Merchant key records appear in the database schema and dashboard read model, but key creation and public
                  route enforcement are not yet documented as an active self-service feature in this application.
                </p>
              </div>
            </div>
          </section>

          {endpointDocs.slice(0, 2).map((doc) => (
            <EndpointArticle key={doc.id} doc={doc} />
          ))}

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="c2b" className="text-3xl font-semibold tracking-[-0.05em]">
              C2B
            </DocHeading>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              The current gateway exposes two C2B routes: one to register Safaricom confirmation and validation URLs,
              and one to simulate a C2B payment in sandbox. Incoming confirmation callbacks can also help reconcile a
              pending STK transaction when the handset callback is missing.
            </p>
            <div className="mt-6 grid gap-6 xl:grid-cols-2">
              <div className="min-w-0 rounded-[1.6rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-900">
                    POST
                  </span>
                  <code className="mono rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700">
                    /api/mpesa/c2b/register
                  </code>
                </div>
                <div className="mt-4 text-lg font-semibold text-slate-950">Register URLs</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Registers the C2B confirmation and validation callback URLs currently configured by the gateway.
                  The only supported input parameter is <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">responseType</code>,
                  which defaults to <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">Completed</code>.
                </p>
                <div className="mt-4 rounded-[1.3rem] border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-slate-500">Configured callback URLs</div>
                  <div className="mono mt-3 break-all text-xs text-slate-700">{config.callbackUrls.c2bConfirmation}</div>
                  <div className="mono mt-2 break-all text-xs text-slate-700">{config.callbackUrls.c2bValidation}</div>
                </div>
              </div>

              <div className="min-w-0 rounded-[1.6rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-900">
                    POST
                  </span>
                  <code className="mono rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700">
                    /api/mpesa/c2b/simulate
                  </code>
                </div>
                <div className="mt-4 text-lg font-semibold text-slate-950">Simulate payment</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Sandbox-only in practical use. Send amount, customer MSISDN, bill reference, and optionally a shortcode override.
                  A successful response means Safaricom accepted the simulated collection request.
                </p>
                <DocsCodeTabs
                  title="C2B callback example"
                  description="A successful confirmation callback is a plain payload rather than a nested STK body."
                  tabs={[
                    {
                      label: "Confirmation",
                      language: "json",
                      tone: "webhook",
                      code: buildC2bConfirmationExample(),
                    },
                  ]}
                />
              </div>
            </div>
          </section>

          {endpointDocs.slice(2, 5).map((doc) => (
            <EndpointArticle key={doc.id} doc={doc} />
          ))}

          <EndpointArticle doc={storedStatusDoc} />

          {endpointDocs.slice(5).map((doc) => (
            <EndpointArticle key={doc.id} doc={doc} />
          ))}

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="webhooks-overview" className="text-3xl font-semibold tracking-[-0.05em]">
              Webhooks Overview
            </DocHeading>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              In the current implementation, the webhook story is primarily inbound Safaricom callback intake. Zadhron
              receives provider callbacks, persists the raw payload in provider events storage when available, attempts
              to reconcile the callback to a transaction, updates the normalized transaction record, and returns an
              acknowledgement payload of <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">{"{ ResultCode: 0, ResultDesc: \"Accepted\" }"}</code>.
            </p>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="webhook-configuration" className="text-3xl font-semibold tracking-[-0.05em]">
              Configuring a webhook
            </DocHeading>
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">Safaricom callback intake</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Configure <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">MPESA_CALLBACK_BASE_URL</code> or
                  <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">PUBLIC_BASE_URL</code>. The gateway then derives the primary
                  <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">/api/mpesa/callbacks/*</code> URLs and legacy
                  <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">/callbacks/payments/*</code> aliases automatically.
                </p>
              </div>
              <div className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">Merchant outbound webhooks</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  The database schema and merchant dashboard include webhook records for Zadhron-to-merchant delivery,
                  but public delivery, signing, and retry behavior are not yet presented as a complete application feature.
                </p>
              </div>
            </div>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="webhook-event-types" className="text-3xl font-semibold tracking-[-0.05em]">
              Event types
            </DocHeading>
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {callbackDocs.map((callback) => (
                <article key={callback.key} className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                  <div className="text-sm font-semibold text-slate-950">{callback.label}</div>
                  <div className="mono mt-2 break-all text-xs text-slate-500">{config.callbackUrls[callback.key]}</div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{callback.purpose}</p>
                </article>
              ))}
            </div>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="webhook-signatures" className="text-3xl font-semibold tracking-[-0.05em]">
              Signature verification
            </DocHeading>
            <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-amber-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-800">
                  Planned
                </span>
                <span className="text-sm font-semibold text-amber-950">No callback signature verification is implemented in the current gateway.</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-amber-900/85">
                The implemented protection for inbound callbacks is optional source-IP allowlisting through
                <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">MPESA_CALLBACK_ALLOWED_IPS</code>.
                Do not document or rely on signed callback headers for this deployment until that feature is actually wired.
              </p>
            </div>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="webhook-retries" className="text-3xl font-semibold tracking-[-0.05em]">
              Retries and failures
            </DocHeading>
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">Inbound callback acceptance</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Callback handlers return an Accepted payload after processing. Raw callback payloads are also stored when the database layer is available.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">IP filtering</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  When <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">MPESA_CALLBACK_ALLOWED_IPS</code> is set, callback requests from other IPs fail authentication.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">Delayed STK completion</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Use STK Query for recovery. The admin side also includes a pending-STK reconciliation path that queries stale CheckoutRequestIDs and updates stored records.
                </p>
              </div>
            </div>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="api-reference-requests" className="text-3xl font-semibold tracking-[-0.05em]">
              Requests
            </DocHeading>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              All public routes live under <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/mpesa/*</code>. Request
              payloads use a developer-facing schema, and the gateway reshapes them into the corresponding Safaricom contract.
            </p>
            <div className="mt-6 overflow-hidden rounded-[1.4rem] border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Header</th>
                    <th className="px-4 py-3">Required</th>
                    <th className="px-4 py-3">Purpose</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-t border-slate-200">
                    <td className="mono px-4 py-3 text-slate-950">Authorization</td>
                    <td className="px-4 py-3 text-slate-600">Yes</td>
                    <td className="px-4 py-3 text-slate-600">Send <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">Bearer &lt;access-token&gt;</code> to authenticate the merchant and authorize scopes.</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="mono px-4 py-3 text-slate-950">Content-Type</td>
                    <td className="px-4 py-3 text-slate-600">For POST</td>
                    <td className="px-4 py-3 text-slate-600">Use application/json for request bodies.</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="mono px-4 py-3 text-slate-950">Idempotency-Key</td>
                    <td className="px-4 py-3 text-slate-600">Recommended</td>
                    <td className="px-4 py-3 text-slate-600">Prevents duplicate money-moving requests when a client retries after transport uncertainty.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="api-reference-responses" className="text-3xl font-semibold tracking-[-0.05em]">
              Responses
            </DocHeading>
            <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
              <div className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Normalized envelope</div>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">success</code>: whether the gateway call succeeded</li>
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">operation</code>: the operation id and scope name</li>
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">requestId</code>: trace identifier also returned as the HTTP <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">x-request-id</code> header</li>
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">status</code>: normalized state such as pending, accepted, succeeded, failed, cancelled, or timeout</li>
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">data</code>: provider response payload when successful</li>
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">upstream</code>: condensed provider metadata</li>
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">meta</code>: gateway metadata such as applicationId, latencyMs, and idempotency context</li>
                </ul>
              </div>
              <div className="min-w-0">
                <DocsCodeTabs
                  title="Sample normalized payload"
                  description="An STK Push response is typically pending at HTTP time and becomes final later through callbacks or query."
                  tabs={[
                    {
                      label: "STK Push",
                      language: "json",
                      tone: "response",
                      code: JSON.stringify(buildExampleResponse(getOperation(operationMap, "stkPush")), null, 2),
                    },
                  ]}
                />
              </div>
            </div>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="api-reference-errors" className="text-3xl font-semibold tracking-[-0.05em]">
              Error format
            </DocHeading>
            <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="min-w-0 rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">Common error codes</div>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">authentication_error</code>: access token or callback source IP rejected</li>
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">authorization_error</code>: token lacks the required scope</li>
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">validation_error</code>: request body or configuration invalid</li>
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">conflict_error</code>: idempotency collision or duplicate in-flight request</li>
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">rate_limit_exceeded</code>: configured token or application rate limit reached</li>
                  <li><code className="mono rounded bg-white px-1.5 py-0.5 text-xs">mpesa_request_failed</code>: upstream Safaricom request failed</li>
                </ul>
              </div>
              <div className="min-w-0">
                <DocsCodeTabs
                  title="Error example"
                  description="Gateway failures still use the same envelope shape and include the operation plus requestId."
                  tabs={[
                    {
                      label: "JSON",
                      language: "json",
                      tone: "response",
                      code: buildErrorExample("stkPush"),
                    },
                  ]}
                />
              </div>
            </div>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="api-reference-idempotency" className="text-3xl font-semibold tracking-[-0.05em]">
              Idempotency
            </DocHeading>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              The gateway currently applies idempotency to money-moving routes when the caller sends an
              <code className="mono rounded bg-slate-100 px-1.5 py-0.5 text-xs">Idempotency-Key</code>. The fingerprint includes the
              operation, application id, and serialized request payload.
            </p>
            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">First request</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  The gateway marks the key as processing, performs the upstream call, then stores the normalized response.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">Exact replay</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  The stored response is replayed and <code className="mono rounded bg-white px-1.5 py-0.5 text-xs">meta.replayed</code> is set to true.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                <div className="text-sm font-semibold text-slate-950">Mismatched reuse</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Reusing the same key with a different payload or while the original request is still running returns a 409 conflict.
                </p>
              </div>
            </div>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="api-reference-http-status" className="text-3xl font-semibold tracking-[-0.05em]">
              HTTP status codes
            </DocHeading>
            <div className="overflow-hidden rounded-[1.4rem] border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Meaning</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  <tr className="border-t border-slate-200">
                    <td className="mono px-4 py-3 text-slate-950">200</td>
                    <td className="px-4 py-3 text-slate-600">Synchronous success or accepted provider response.</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="mono px-4 py-3 text-slate-950">202</td>
                    <td className="px-4 py-3 text-slate-600">Typical immediate STK Push acceptance while the transaction remains pending.</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="mono px-4 py-3 text-slate-950">401</td>
                    <td className="px-4 py-3 text-slate-600">Authentication failed.</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="mono px-4 py-3 text-slate-950">403</td>
                    <td className="px-4 py-3 text-slate-600">Authenticated application lacks permission for the requested operation.</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="mono px-4 py-3 text-slate-950">409</td>
                    <td className="px-4 py-3 text-slate-600">Idempotency conflict or duplicate in-flight request.</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="mono px-4 py-3 text-slate-950">422</td>
                    <td className="px-4 py-3 text-slate-600">Request validation failed.</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="mono px-4 py-3 text-slate-950">429</td>
                    <td className="px-4 py-3 text-slate-600">Application rate limit exceeded.</td>
                  </tr>
                  <tr className="border-t border-slate-200">
                    <td className="mono px-4 py-3 text-slate-950">502 / 503</td>
                    <td className="px-4 py-3 text-slate-600">Safaricom request failure or indeterminate upstream state.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="additional-operations" className="text-3xl font-semibold tracking-[-0.05em]">
              Additional operations
            </DocHeading>
            <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">
              The following routes exist in the operation catalog but are intentionally kept out of the primary quick-start path
              because they are more provider-specific, pass-through, or operationally specialized.
            </p>
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {additionalOperations.map((operation) => {
                const callbacks = relatedCallbacks(operation.id, config);
                return (
                  <article key={operation.id} className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${
                        operation.method === "POST" ? "bg-sky-100 text-sky-900" : "bg-emerald-100 text-emerald-900"
                      }`}>
                        {operation.method}
                      </span>
                      <code className="mono rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700">
                        {operation.route}
                      </code>
                    </div>
                    <div className="mt-4 text-lg font-semibold text-slate-950">{operation.label}</div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{operation.description}</p>
                    {callbacks.length ? (
                      <div className="mt-4 text-xs text-slate-500">
                        Callback routes:
                        {callbacks.map((callback) => (
                          <div key={`${operation.id}-${callback.key}`} className="mono mt-1 break-all text-[11px] text-slate-600">
                            {callback.url}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className={sectionFrameClass}>
            <DocHeading as="h2" id="changelog" className="text-3xl font-semibold tracking-[-0.05em]">
              Changelog
            </DocHeading>
            <div className="rounded-[1.5rem] border border-slate-200 bg-[#fafbfd] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Planned
                </span>
                <span className="text-sm font-semibold text-slate-950">A dedicated public changelog page is not implemented yet.</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Until a public changelog route ships, treat this page and the repository history as the authoritative reference for current gateway behavior.
              </p>
            </div>
          </section>
        </div>
      </DeveloperDocsShell>
    </main>
  );
}
