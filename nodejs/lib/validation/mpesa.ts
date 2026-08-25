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
  transactionStatus: transactionStatusSchema,
  reversal: reversalSchema,
  accountBalance: accountBalanceSchema,
  ratiba: ratibaSchema,
};
