import type { GatewayConfig } from "@/lib/mpesa/types";
import type { MpesaOperation } from "@/types/gateway";
import type { OperationDefinition } from "@/lib/gateway/catalog";

type Props = {
  config: GatewayConfig;
  operations: OperationDefinition[];
};

type OperationGroup = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  operations: MpesaOperation[];
};

type CallbackDoc = {
  key: string;
  label: string;
  purpose: string;
  operations: MpesaOperation[];
};

const operationGroups: OperationGroup[] = [
  {
    id: "access",
    title: "Access And Health",
    eyebrow: "Control plane",
    description: "Authentication checks, token health, and read-style request paths.",
    operations: ["oauthToken", "stkQuery", "transactionStatus", "accountBalance"],
  },
  {
    id: "collections",
    title: "Collections",
    eyebrow: "Customer money-in",
    description: "Prompt customers, simulate paybill collections, and inspect collection feeds.",
    operations: ["stkPush", "c2bRegister", "c2bSimulate", "pullTransactions", "pullTransactionsQuery", "pullTransactionsRegister"],
  },
  {
    id: "payouts",
    title: "Payouts And Treasury",
    eyebrow: "Money-out and reversals",
    description: "Operational disbursements, business transfers, and post-payment correction flows.",
    operations: ["b2c", "b2b", "businessToPochi", "reversal"],
  },
  {
    id: "extensions",
    title: "Extensions",
    eyebrow: "Adjacent provider features",
    description: "QR, Bill Manager, mobile validation, and Ratiba passthrough integrations.",
    operations: [
      "dynamicQrCode",
      "billManager",
      "billManagerOptin",
      "billManagerChangeOptinDetails",
      "billManagerCreateSingleInvoice",
      "billManagerCreateBulkInvoices",
      "billManagerCancelSingleInvoice",
      "billManagerCancelBulkInvoices",
      "billManagerReconciliation",
      "mobileNumberValidation",
      "ratiba",
    ],
  },
];

const callbackDocs: CallbackDoc[] = [
  { key: "stk", label: "STK callback", purpose: "Finalizes STK checkout outcome payloads.", operations: ["stkPush"] },
  {
    key: "c2bConfirmation",
    label: "C2B confirmation",
    purpose: "Receives paybill/till confirmation and can reconcile missing STK terminal events.",
    operations: ["c2bRegister", "c2bSimulate", "stkPush"],
  },
  {
    key: "c2bValidation",
    label: "C2B validation",
    purpose: "Receives validation requests before C2B confirmation.",
    operations: ["c2bRegister"],
  },
  { key: "b2cResult", label: "B2C result", purpose: "Receives asynchronous B2C completion result.", operations: ["b2c", "businessToPochi"] },
  { key: "b2cTimeout", label: "B2C timeout", purpose: "Receives B2C queue timeout notification.", operations: ["b2c", "businessToPochi"] },
  { key: "b2bResult", label: "B2B result", purpose: "Receives asynchronous B2B completion result.", operations: ["b2b"] },
  { key: "b2bTimeout", label: "B2B timeout", purpose: "Receives B2B queue timeout notification.", operations: ["b2b"] },
  {
    key: "transactionStatusResult",
    label: "Transaction status result",
    purpose: "Returns the asynchronous answer for transaction-status lookups.",
    operations: ["transactionStatus"],
  },
  {
    key: "transactionStatusTimeout",
    label: "Transaction status timeout",
    purpose: "Returns timeout notices for transaction-status lookups.",
    operations: ["transactionStatus"],
  },
  { key: "reversalResult", label: "Reversal result", purpose: "Receives final reversal outcome.", operations: ["reversal"] },
  { key: "reversalTimeout", label: "Reversal timeout", purpose: "Receives reversal queue timeout notice.", operations: ["reversal"] },
  {
    key: "accountBalanceResult",
    label: "Account balance result",
    purpose: "Returns the provider's official balance snapshot for the configured shortcode.",
    operations: ["accountBalance"],
  },
  {
    key: "accountBalanceTimeout",
    label: "Account balance timeout",
    purpose: "Returns timeout notices for account-balance queries.",
    operations: ["accountBalance"],
  },
  { key: "ratiba", label: "Ratiba callback", purpose: "Receives Ratiba-specific asynchronous payloads.", operations: ["ratiba"] },
  {
    key: "pullTransactions",
    label: "Pull Transactions callback",
    purpose: "Receives bulk or registration responses for pull-transaction workflows.",
    operations: ["pullTransactions", "pullTransactionsQuery", "pullTransactionsRegister"],
  },
  {
    key: "billManager",
    label: "Bill Manager callback",
    purpose: "Receives Bill Manager downstream payloads and acknowledgements.",
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

const operationNotes: Partial<Record<MpesaOperation, string[]>> = {
  oauthToken: [
    "No application JSON body is required.",
    "Use this route to verify OAuth reachability and cache health before live operations.",
  ],
  stkPush: [
    "The initial HTTP response is usually accepted for processing and the terminal result arrives later by callback.",
    "The gateway sanitizes `accountReference` and `transactionDesc` before sending them upstream.",
  ],
  stkQuery: [
    "Use the earlier `CheckoutRequestID` from an STK push response.",
    "This is the fastest manual recovery path when a callback is delayed or missing.",
  ],
  c2bRegister: [
    "This registers the confirmation and validation callback URLs currently configured in the gateway.",
    "Safaricom may reject callback URLs that violate Daraja naming restrictions.",
  ],
  c2bSimulate: [
    "Sandbox-only in practical use.",
    "Useful for validating downstream callback handling without a handset prompt.",
  ],
  b2c: [
    "This is an asynchronous treasury operation. The initial response confirms acceptance, not payout completion.",
    "Use a stable `Idempotency-Key` when retrying after network uncertainty.",
  ],
  b2b: [
    "The gateway submits the configured shortcode as `PartyA` and the provided receiver shortcode as `PartyB`.",
    "The final result still arrives through callback routes.",
  ],
  businessToPochi: [
    "This shares the B2C-style callback rail in the current implementation.",
    "Use it when Safaricom has enabled the B2Pochi product for your shortcode.",
  ],
  dynamicQrCode: [
    "The gateway does not reshape the provider payload beyond validation and routing.",
    "Use `pathOverride` only when Safaricom has provisioned a non-default route.",
  ],
  billManager: [
    "This is a generic passthrough for approved Bill Manager actions.",
    "Downstream payload shape depends on the Bill Manager action you are enabled for.",
  ],
  billManagerOptin: [
    "Environment defaults are merged in before upstream submission.",
    "The configured Bill Manager callback is used unless explicitly overridden.",
  ],
  billManagerChangeOptinDetails: [
    "This shares the same payload contract as Bill Manager opt-in.",
    "Use it to refresh Bill Manager registration metadata without changing routes elsewhere.",
  ],
  billManagerCreateSingleInvoice: [
    "The payload is forwarded as provided after non-empty validation.",
  ],
  billManagerCreateBulkInvoices: [
    "At least one invoice object is required.",
  ],
  billManagerCancelSingleInvoice: [
    "Cancellation is keyed by `externalReference` in the current gateway surface.",
  ],
  billManagerCancelBulkInvoices: [
    "Cancellation is keyed by `externalReference` in the current gateway surface.",
  ],
  billManagerReconciliation: [
    "This route expects a raw reconciliation payload object.",
  ],
  pullTransactions: [
    "This is the generic pass-through entry point for pull-transactions actions.",
    "Use `pathOverride` when you need the registration endpoint through the same route shape.",
  ],
  pullTransactionsQuery: [
    "Date values must use `YYYY-MM-DD HH:MM:SS`.",
    "The current provider route is limited to the recent transaction window described by Daraja.",
  ],
  pullTransactionsRegister: [
    "Environment defaults fill in the shortcode, nominated number, request type, and callback URL.",
  ],
  mobileNumberValidation: [
    "This is a provider-specific pass-through payload.",
  ],
  transactionStatus: [
    "This is an asynchronous query. Completion is delivered through the result or timeout callbacks.",
  ],
  reversal: [
    "A successful initial response still requires the reversal callback for terminal confirmation.",
  ],
  accountBalance: [
    "This route requests the provider's official balance snapshot.",
    "The admin dashboard uses the official callback snapshot as a baseline and layers later transaction deltas on top.",
  ],
  ratiba: [
    "If the payload omits `CallBackURL`, the gateway injects the configured Ratiba callback.",
  ],
};

function toAnchor(id: string) {
  return id.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function isJsonField(operationId: MpesaOperation, fieldName: string) {
  return (
    fieldName === "payload" ||
    fieldName === "invoices" ||
    (operationId === "billManagerCreateSingleInvoice" && fieldName !== "") ||
    (operationId === "billManagerReconciliation" && fieldName !== "")
  );
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
      originatorConversationId: "ops-payout-2026-08-30-01",
    },
    b2b: {
      receiverShortcode: "600999",
      amount: 5000,
      remarks: "Settlement transfer",
      commandId: "BusinessPayBill",
      accountReference: "SETTLE-1001",
      senderIdentifierType: "4",
      receiverIdentifierType: "4",
    },
    businessToPochi: {
      phoneNumber: "254712345678",
      amount: 1200,
      remarks: "Merchant cashout",
      commandId: "BusinessPayToPochi",
      occasion: "Field refund",
      originatorConversationId: "pochi-2026-08-30-01",
    },
    dynamicQrCode: {
      payload: {
        MerchantName: "Zadhron",
        RefNo: "INV1001",
        Amount: 1500,
        TrxCode: "BG",
        CPI: "174379",
        Size: "300",
      },
      pathOverride: "/mpesa/qrcode/v1/generate",
    },
    billManager: {
      payload: {
        externalReference: "INV1001",
        action: "acknowledge",
      },
      pathOverride: "/v1/billmanager-invoice/acknowledgement",
    },
    billManagerOptin: {
      shortcode: "174379",
      email: "billing@zadhron.com",
      officialContact: "254722000000",
      sendReminders: 1,
      logo: "https://payments.zadhron.com/logo.png",
      callbackurl: "https://payments.zadhron.com/callbacks/payments/bill-manager",
    },
    billManagerChangeOptinDetails: {
      shortcode: "174379",
      email: "billing@zadhron.com",
      officialContact: "254722000000",
      sendReminders: 1,
      logo: "https://payments.zadhron.com/logo.png",
      callbackurl: "https://payments.zadhron.com/callbacks/payments/bill-manager",
    },
    billManagerCreateSingleInvoice: {
      payload: {
        externalReference: "INV1001",
        invoiceName: "August utilities",
        amount: 1500,
        dueDate: "2026-09-05",
      },
    },
    billManagerCreateBulkInvoices: {
      invoices: [
        { externalReference: "INV1001", amount: 1500, invoiceName: "August utilities" },
        { externalReference: "INV1002", amount: 2200, invoiceName: "August airtime" },
      ],
    },
    billManagerCancelSingleInvoice: {
      externalReference: "INV1001",
    },
    billManagerCancelBulkInvoices: {
      externalReference: "BULK-1001",
    },
    billManagerReconciliation: {
      payload: {
        startDate: "2026-08-01",
        endDate: "2026-08-30",
      },
    },
    pullTransactions: {
      payload: {
        ShortCode: "174379",
        StartDate: "2026-08-30 00:00:00",
        EndDate: "2026-08-30 23:59:59",
        OffSetValue: "0",
      },
      pathOverride: "/pulltransactions/v1/query",
    },
    pullTransactionsQuery: {
      ShortCode: "174379",
      StartDate: "2026-08-30 00:00:00",
      EndDate: "2026-08-30 23:59:59",
      OffSetValue: "0",
    },
    pullTransactionsRegister: {
      ShortCode: "174379",
      RequestType: "Pull",
      NominatedNumber: "254733000000",
      CallBackURL: "https://payments.zadhron.com/callbacks/payments/pull-transactions",
    },
    mobileNumberValidation: {
      payload: {
        phoneNumber: "254712345678",
        serviceCode: "customer-onboarding",
      },
      pathOverride: "/mobile-number-validation/v1/validate",
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
    ratiba: {
      payload: {
        planId: "RATIBA-1001",
        amount: 750,
        frequency: "monthly",
      },
    },
  };

  return samples[operationId]?.[fieldName];
}

function buildExampleRequest(operation: OperationDefinition) {
  if (operation.method === "GET") {
    return null;
  }

  const explicitPayload =
    operation.id === "billManagerCreateSingleInvoice" || operation.id === "billManagerReconciliation"
      ? exampleValue(operation.id, "payload")
      : null;

  if (explicitPayload && typeof explicitPayload === "object" && !Array.isArray(explicitPayload)) {
    return explicitPayload;
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
    requestId: "req_01hzk-demo",
    timestamp: "2026-08-30T16:45:00.000Z",
    status: inferStatus(operation.id),
    httpStatus: operation.id === "stkPush" ? 202 : 200,
  };

  switch (operation.id) {
    case "oauthToken":
      return {
        ...common,
        data: {
          tokenAvailable: true,
          cache: {
            cached: true,
          },
        },
        meta: {
          applicationId: "app_live",
          latencyMs: 84,
        },
      };
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
          idempotencyKey: "stk-20260830-1001",
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
          ConversationID: "AG_20260830_123456789abc",
          OriginatorConversationID: "ops-reference-1001",
        },
        upstream: {
          httpStatus: 200,
          conversationId: "AG_20260830_123456789abc",
          originatorConversationId: "ops-reference-1001",
          responseCode: "0",
          responseDescription: "Accept the service request successfully.",
        },
        meta: {
          applicationId: "app_live",
          ...(operation.moneyMoving ? { idempotencyKey: "moneyflow-20260830-1001" } : {}),
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
          ...(operation.moneyMoving ? { idempotencyKey: "moneyflow-20260830-1001" } : {}),
          latencyMs: 190,
        },
      };
  }
}

function buildCurlExample(operation: OperationDefinition, baseUrl: string) {
  const lines = [
    `curl -X ${operation.method} "${baseUrl}${operation.route}"`,
    '  -H "x-zadhron-app-id: app_live"',
    '  -H "x-zadhron-app-secret: replace-with-secret"',
  ];

  if (operation.method !== "GET") {
    lines.push('  -H "Content-Type: application/json"');
  }

  if (operation.moneyMoving) {
    lines.push('  -H "Idempotency-Key: moneyflow-20260830-1001"');
  }

  const request = buildExampleRequest(operation);
  if (request) {
    lines.push(`  --data-raw '${JSON.stringify(request, null, 2)}'`);
  }

  return lines.join(" \\\n");
}

function callbacksForOperation(operationId: MpesaOperation) {
  return callbackDocs.filter((item) => item.operations.includes(operationId));
}

function methodTone(method: OperationDefinition["method"]) {
  return method === "GET" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800";
}

function moneyFlowLabel(operation: OperationDefinition) {
  return operation.moneyMoving ? "Money moving" : "Control or query";
}

export function DeveloperDocs({ config, operations }: Props) {
  const operationMap = new Map(operations.map((operation) => [operation.id, operation]));
  const dateLabel = "August 30, 2026";

  return (
    <main className="bg-[#f6efe4] px-5 py-12 text-slate-950 sm:px-8 lg:py-16">
      <div className="mx-auto max-w-[1440px] space-y-8">
        <section className="overflow-hidden rounded-[2.6rem] border border-slate-200 bg-[linear-gradient(135deg,#fffaf1_0%,#fff 48%,#edf6ff_100%)] shadow-[0_28px_90px_rgba(12,18,27,0.08)]">
          <div className="grid gap-8 px-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-12">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Developer docs</div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl">
                Detailed API reference for the Node.js M-Pesa gateway.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600">
                This reference documents the live request contract enforced by the gateway on{" "}
                {dateLabel}. It covers application authentication, idempotency behavior, normalized
                responses, callback routing, and every supported `/api/mpesa/*` operation exposed by
                the Node.js deployment.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#quickstart"
                  className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Jump to quickstart
                </a>
                <a
                  href="#operations"
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm text-slate-700 transition hover:border-slate-400 hover:bg-white"
                >
                  Browse endpoints
                </a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.8rem] border border-slate-200 bg-white/90 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Base URL</div>
                <div className="mono mt-3 break-all text-sm text-slate-900">{config.callbackBaseUrl}</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Application requests and callback routes are served from the same deployment.
                </p>
              </div>
              <div className="rounded-[1.8rem] border border-slate-200 bg-white/90 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Upstream</div>
                <div className="mono mt-3 break-all text-sm text-slate-900">{config.mpesaBaseUrl}</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Current gateway environment: <span className="font-medium text-slate-900">{config.mpesaEnvironment}</span>.
                </p>
              </div>
              <div className="rounded-[1.8rem] border border-slate-200 bg-white/90 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Operations</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">{operations.length}</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Every public route in the operation catalog is documented below from the same source
                  used by the admin endpoint tester.
                </p>
              </div>
              <div className="rounded-[1.8rem] border border-slate-200 bg-white/90 p-5">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Callback guard</div>
                <div className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                  {config.callbackAllowedIps.length ? "Restricted" : "Open"}
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {config.callbackAllowedIps.length
                    ? `Safaricom callback intake is currently filtered by ${config.callbackAllowedIps.length} allowed source IP${config.callbackAllowedIps.length === 1 ? "" : "s"}.`
                    : "No callback source allowlist is configured in the current environment."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(7,16,25,0.06)]">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">On this page</div>
              <nav className="mt-5 space-y-2 text-sm text-slate-700">
                {[
                  ["quickstart", "Quickstart"],
                  ["security", "Authentication"],
                  ["responses", "Responses"],
                  ["operations", "Endpoint reference"],
                  ["callbacks", "Callbacks"],
                ].map(([href, label]) => (
                  <a
                    key={href}
                    href={`#${href}`}
                    className="block rounded-full px-3 py-2 transition hover:bg-slate-100 hover:text-slate-950"
                  >
                    {label}
                  </a>
                ))}
              </nav>
              <div className="mt-6 border-t border-slate-200 pt-6">
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Headers</div>
                <div className="mono mt-3 text-xs leading-7 text-slate-600">
                  <div>`x-zadhron-app-id`</div>
                  <div>`x-zadhron-app-secret`</div>
                  <div>`Idempotency-Key`</div>
                  <div>`x-request-id`</div>
                </div>
              </div>
            </div>
          </aside>

          <div className="space-y-8">
            <section id="quickstart" className="rounded-[2.4rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.06)] sm:p-10">
              <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Quickstart</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Call the gateway in four steps.</h2>
              <div className="mt-8 grid gap-4 lg:grid-cols-4">
                {[
                  {
                    title: "1. Get application credentials",
                    body: "The gateway authenticates each request with x-zadhron-app-id and x-zadhron-app-secret.",
                  },
                  {
                    title: "2. Send a scoped request",
                    body: "Call the route your application has been granted. Scope names match the operation ids below.",
                  },
                  {
                    title: "3. Read the normalized response",
                    body: "Every route returns a shared response envelope with operation, status, timestamps, upstream metadata, and request id.",
                  },
                  {
                    title: "4. Wait for callbacks when async",
                    body: "STK, B2C, B2B, reversal, status, and balance flows can finish later through callback routes.",
                  },
                ].map((item) => (
                  <article key={item.title} className="rounded-[1.6rem] border border-slate-200 bg-[#fbfaf7] p-5">
                    <div className="text-base font-semibold text-slate-950">{item.title}</div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
                  </article>
                ))}
              </div>

              <div className="mt-8 rounded-[1.8rem] border border-slate-200 bg-[#09111a] p-6 text-slate-100">
                <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Example request</div>
                <pre className="mono mt-4 overflow-x-auto text-sm leading-7">
{buildCurlExample(operationMap.get("stkPush")!, config.callbackBaseUrl)}
                </pre>
              </div>
            </section>

            <section id="security" className="rounded-[2.4rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.06)] sm:p-10">
              <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Authentication</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Application auth, scopes, and retry safety.</h2>
              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                <div className="rounded-[1.8rem] border border-slate-200 bg-[#fbfaf7] p-6">
                  <h3 className="text-lg font-semibold text-slate-950">Required request headers</h3>
                  <div className="mono mt-4 space-y-3 text-sm text-slate-700">
                    <div>`x-zadhron-app-id`: configured application id</div>
                    <div>`x-zadhron-app-secret`: configured application secret</div>
                    <div>`Content-Type: application/json`: required for JSON bodies</div>
                    <div>`Idempotency-Key`: optional but recommended for money-moving routes</div>
                  </div>
                </div>
                <div className="rounded-[1.8rem] border border-slate-200 bg-[#fbfaf7] p-6">
                  <h3 className="text-lg font-semibold text-slate-950">What the gateway enforces</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                    <li>Application ids must exist, be enabled, and have a matching secret.</li>
                    <li>Scopes are checked per operation id. A wildcard `*` also passes authorization.</li>
                    <li>Per-application rate limits apply when configured for that application.</li>
                    <li>Callback routes are separate from application auth and are intended for Safaricom delivery.</li>
                  </ul>
                </div>
              </div>
            </section>

            <section id="responses" className="rounded-[2.4rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.06)] sm:p-10">
              <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Responses</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">A shared response envelope across operations.</h2>
              <div className="mt-8 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-[1.8rem] border border-slate-200 bg-[#fbfaf7] p-6">
                  <h3 className="text-lg font-semibold text-slate-950">Common fields</h3>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                    <li>`success`: boolean success flag for the gateway request itself.</li>
                    <li>`operation`: the internal operation id, which also doubles as the auth scope.</li>
                    <li>`status`: normalized transaction status such as `pending`, `accepted`, `succeeded`, `failed`, `cancelled`, or `timeout`.</li>
                    <li>`upstream`: condensed provider metadata such as response code, conversation id, and provider request ids.</li>
                    <li>`meta`: gateway metadata including application id, latency, and idempotency replay context.</li>
                    <li>The HTTP response also includes the `x-request-id` header for tracing.</li>
                  </ul>
                </div>
                <div className="rounded-[1.8rem] border border-slate-200 bg-[#09111a] p-6 text-slate-100">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">Sample normalized payload</div>
                  <pre className="mono mt-4 overflow-x-auto text-sm leading-7">
{JSON.stringify(buildExampleResponse(operationMap.get("stkPush")!), null, 2)}
                  </pre>
                </div>
              </div>
            </section>

            <section id="operations" className="space-y-8">
              <div className="rounded-[2.4rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.06)] sm:p-10">
                <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Endpoint reference</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Every supported route, grouped by job to be done.</h2>
                <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600">
                  The cards below are generated from the live operation catalog. Each route shows the
                  public endpoint, the exact scope id your application needs, request fields, callback
                  dependencies, and example request or response bodies.
                </p>
              </div>

              {operationGroups.map((group) => {
                const groupOperations = group.operations
                  .map((id) => operationMap.get(id))
                  .filter((item): item is OperationDefinition => Boolean(item));

                if (!groupOperations.length) {
                  return null;
                }

                return (
                  <section key={group.id} className="rounded-[2.4rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.06)] sm:p-10">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">{group.eyebrow}</div>
                    <h3 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">{group.title}</h3>
                    <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600">{group.description}</p>

                    <div className="mt-8 space-y-6">
                      {groupOperations.map((operation) => {
                        const requestExample = buildExampleRequest(operation);
                        const responseExample = buildExampleResponse(operation);
                        const relatedCallbacks = callbacksForOperation(operation.id);

                        return (
                          <article
                            key={operation.id}
                            id={toAnchor(operation.id)}
                            className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fcfbf8]"
                          >
                            <div className="border-b border-slate-200 bg-white px-6 py-6">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${methodTone(operation.method)}`}>
                                      {operation.method}
                                    </span>
                                    <span className="rounded-full border border-slate-300 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-600">
                                      {moneyFlowLabel(operation)}
                                    </span>
                                    <span className="rounded-full border border-slate-300 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-600">
                                      Scope {operation.id}
                                    </span>
                                  </div>
                                  <h4 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                                    {operation.label}
                                  </h4>
                                  <div className="mono mt-3 break-all text-sm text-slate-500">
                                    {config.callbackBaseUrl}{operation.route}
                                  </div>
                                </div>
                                <a
                                  href={`#${toAnchor(operation.id)}`}
                                  className="rounded-full border border-slate-300 px-3 py-2 text-xs uppercase tracking-[0.16em] text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
                                >
                                  Link
                                </a>
                              </div>
                              <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600">{operation.description}</p>
                            </div>

                            <div className="grid gap-6 px-6 py-6 xl:grid-cols-[0.72fr_1.28fr]">
                              <div className="space-y-6">
                                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Request contract</div>
                                  {operation.fields.length ? (
                                    <div className="mt-4 space-y-4">
                                      {operation.fields.map((field) => (
                                        <div key={field.name} className="rounded-[1.2rem] border border-slate-200 bg-[#fbfaf7] p-4">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="mono text-sm text-slate-900">{field.name}</span>
                                            <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                                              {field.type}
                                            </span>
                                            <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                                              {field.required ? "required" : "optional"}
                                            </span>
                                          </div>
                                          <div className="mt-2 text-sm font-medium text-slate-950">{field.label}</div>
                                          <p className="mt-2 text-sm leading-7 text-slate-600">{field.description}</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="mt-4 text-sm leading-7 text-slate-600">
                                      This route does not require an application JSON body.
                                    </p>
                                  )}
                                </div>

                                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Behavior notes</div>
                                  <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                                    {(operationNotes[operation.id] ?? ["No extra notes for this route beyond the request and callback contracts shown here."]).map((note) => (
                                      <li key={note}>{note}</li>
                                    ))}
                                  </ul>
                                </div>

                                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Related callbacks</div>
                                  {relatedCallbacks.length ? (
                                    <div className="mt-4 space-y-3">
                                      {relatedCallbacks.map((callback) => (
                                        <div key={`${operation.id}-${callback.key}`} className="rounded-[1.2rem] border border-slate-200 bg-[#fbfaf7] p-4">
                                          <div className="text-sm font-medium text-slate-950">{callback.label}</div>
                                          <div className="mono mt-2 break-all text-xs text-slate-500">
                                            {config.callbackUrls[callback.key]}
                                          </div>
                                          <p className="mt-2 text-sm leading-7 text-slate-600">{callback.purpose}</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="mt-4 text-sm leading-7 text-slate-600">
                                      No dedicated callback route is associated with this endpoint in the current gateway contract.
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-6">
                                <div className="rounded-[1.6rem] border border-slate-200 bg-[#09111a] p-5 text-slate-100">
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">cURL example</div>
                                  <pre className="mono mt-4 overflow-x-auto text-sm leading-7">
{buildCurlExample(operation, config.callbackBaseUrl)}
                                  </pre>
                                </div>

                                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Example JSON body</div>
                                  <pre className="mono mt-4 overflow-x-auto rounded-[1.2rem] bg-[#fbfaf7] p-4 text-sm leading-7 text-slate-800">
{requestExample ? JSON.stringify(requestExample, null, 2) : "{ }"}
                                  </pre>
                                </div>

                                <div className="rounded-[1.6rem] border border-slate-200 bg-white p-5">
                                  <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Example normalized response</div>
                                  <pre className="mono mt-4 overflow-x-auto rounded-[1.2rem] bg-[#fbfaf7] p-4 text-sm leading-7 text-slate-800">
{JSON.stringify(responseExample, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </section>

            <section id="callbacks" className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-[2.4rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.06)] sm:p-10">
                <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Callbacks</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Primary callback routes.</h2>
                <div className="mt-8 space-y-4">
                  {callbackDocs.map((callback) => (
                    <div key={callback.key} className="rounded-[1.5rem] border border-slate-200 bg-[#fbfaf7] p-5">
                      <div className="text-sm font-semibold text-slate-950">{callback.label}</div>
                      <div className="mono mt-2 break-all text-xs text-slate-500">{config.callbackUrls[callback.key]}</div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">{callback.purpose}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2.4rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(7,16,25,0.06)] sm:p-10">
                <div className="text-[11px] uppercase tracking-[0.18em] text-sky-700">Compatibility</div>
                <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Legacy callback aliases.</h2>
                <p className="mt-4 text-sm leading-8 text-slate-600">
                  These routes remain available for compatibility with the earlier Python deployment
                  and existing Safaricom registrations. They resolve to the same callback handling
                  layer as the primary routes above.
                </p>
                <div className="mt-8 space-y-4">
                  {callbackDocs.map((callback) => (
                    <div key={`legacy-${callback.key}`} className="rounded-[1.5rem] border border-slate-200 bg-[#fbfaf7] p-5">
                      <div className="text-sm font-semibold text-slate-950">{callback.label}</div>
                      <div className="mono mt-2 break-all text-xs text-slate-500">{config.legacyCallbackUrls[callback.key]}</div>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Use this alias only when you need continuity with older callback registrations.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
