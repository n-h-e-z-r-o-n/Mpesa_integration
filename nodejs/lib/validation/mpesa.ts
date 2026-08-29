import { z } from "zod";

export const stkPushSchema = z.object({
  phoneNumber: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  accountReference: z.string().min(1),
  transactionDesc: z.string().min(1),
  transactionType: z.string().default("CustomerPayBillOnline"),
});

export const stkQuerySchema = z.object({
  checkoutRequestId: z.string().min(1),
});

export const c2bRegisterSchema = z.object({
  responseType: z.enum(["Completed", "Cancelled"]).default("Completed"),
});

export const c2bSimulateSchema = z.object({
  amount: z.coerce.number().int().positive(),
  phoneNumber: z.string().min(1),
  billRefNumber: z.string().min(1),
  commandId: z.string().default("CustomerPayBillOnline"),
  shortcode: z.string().optional(),
});

export const b2cSchema = z.object({
  phoneNumber: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  remarks: z.string().min(1),
  commandId: z.string().default("BusinessPayment"),
  occasion: z.string().default(""),
  originatorConversationId: z.string().optional(),
});

export const b2bSchema = z.object({
  receiverShortcode: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  remarks: z.string().min(1),
  commandId: z.string().default("BusinessPayBill"),
  accountReference: z.string().default(""),
  senderIdentifierType: z.string().default("4"),
  receiverIdentifierType: z.string().default("4"),
});

export const businessToPochiSchema = z.object({
  phoneNumber: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  remarks: z.string().min(1),
  commandId: z.string().default("BusinessPayToPochi"),
  occasion: z.string().default(""),
  originatorConversationId: z.string().optional(),
});

const pathOverrideSchema = z.string().trim().startsWith("/").optional();

function isPullTransactionsDateTime(value: string) {
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
}

function nonEmptyPayloadSchema(message: string) {
  return z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0, {
    message,
  });
}

export const dynamicQrCodeSchema = z.object({
  payload: nonEmptyPayloadSchema("Dynamic QRCode payload cannot be empty"),
  pathOverride: pathOverrideSchema,
});

export const billManagerSchema = z.object({
  payload: nonEmptyPayloadSchema("Bill Manager payload cannot be empty"),
  pathOverride: pathOverrideSchema,
});

export const billManagerOptinSchema = z
  .object({
    shortcode: z.string().optional(),
    email: z.string().optional(),
    officialContact: z.string().optional(),
    sendReminders: z.coerce.number().int().optional(),
    logo: z.string().optional(),
    callbackurl: z.string().url().optional(),
  })
  .default({});

export const billManagerCreateSingleInvoiceSchema = nonEmptyPayloadSchema(
  "Bill Manager single invoice payload cannot be empty",
);

export const billManagerCreateBulkInvoicesSchema = z.object({
  invoices: z.array(z.record(z.string(), z.unknown())).min(1),
});

export const billManagerCancelInvoiceSchema = z.object({
  externalReference: z.string().min(1),
});

export const billManagerReconciliationSchema = nonEmptyPayloadSchema(
  "Bill Manager reconciliation payload cannot be empty",
);

export const pullTransactionsSchema = z.object({
  payload: nonEmptyPayloadSchema("Pull Transactions payload cannot be empty"),
  pathOverride: pathOverrideSchema,
});

export const pullTransactionsQuerySchema = z.object({
  ShortCode: z.string().min(1),
  StartDate: z.string().refine(isPullTransactionsDateTime, {
    message: "Pull Transactions dates must use format YYYY-MM-DD HH:MM:SS",
  }),
  EndDate: z.string().refine(isPullTransactionsDateTime, {
    message: "Pull Transactions dates must use format YYYY-MM-DD HH:MM:SS",
  }),
  OffSetValue: z.string().default("0"),
});

export const pullTransactionsRegisterSchema = z
  .object({
    ShortCode: z.string().optional(),
    RequestType: z.string().optional(),
    NominatedNumber: z.string().optional(),
    CallBackURL: z.string().url().optional(),
  })
  .default({});

export const mobileNumberValidationSchema = z.object({
  payload: nonEmptyPayloadSchema("Mobile Number Validation payload cannot be empty"),
  pathOverride: pathOverrideSchema,
});

export const transactionStatusSchema = z.object({
  transactionId: z.string().min(1),
  remarks: z.string().default("Transaction status query"),
  occasion: z.string().default(""),
  identifierType: z.string().default("4"),
  commandId: z.string().default("TransactionStatusQuery"),
});

export const reversalSchema = z.object({
  transactionId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  remarks: z.string().min(1),
  occasion: z.string().default(""),
  receiverParty: z.string().optional(),
  receiverIdentifierType: z.string().default("11"),
  commandId: z.string().default("TransactionReversal"),
});

export const accountBalanceSchema = z.object({
  remarks: z.string().default("Account balance query"),
  identifierType: z.string().default("4"),
  commandId: z.string().default("AccountBalance"),
});

export const ratibaSchema = z.object({
  payload: z.record(z.string(), z.unknown()).refine((value) => Object.keys(value).length > 0, {
    message: "Ratiba payload cannot be empty",
  }),
});

export const schemaByOperation = {
  oauthToken: z.object({}).default({}),
  stkPush: stkPushSchema,
  stkQuery: stkQuerySchema,
  c2bRegister: c2bRegisterSchema,
  c2bSimulate: c2bSimulateSchema,
  b2c: b2cSchema,
  b2b: b2bSchema,
  businessToPochi: businessToPochiSchema,
  dynamicQrCode: dynamicQrCodeSchema,
  billManager: billManagerSchema,
  billManagerOptin: billManagerOptinSchema,
  billManagerChangeOptinDetails: billManagerOptinSchema,
  billManagerCreateSingleInvoice: billManagerCreateSingleInvoiceSchema,
  billManagerCreateBulkInvoices: billManagerCreateBulkInvoicesSchema,
  billManagerCancelSingleInvoice: billManagerCancelInvoiceSchema,
  billManagerCancelBulkInvoices: billManagerCancelInvoiceSchema,
  billManagerReconciliation: billManagerReconciliationSchema,
  pullTransactions: pullTransactionsSchema,
  pullTransactionsQuery: pullTransactionsQuerySchema,
  pullTransactionsRegister: pullTransactionsRegisterSchema,
  mobileNumberValidation: mobileNumberValidationSchema,
  transactionStatus: transactionStatusSchema,
  reversal: reversalSchema,
  accountBalance: accountBalanceSchema,
  ratiba: ratibaSchema,
};
