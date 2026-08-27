import type { MpesaOperation } from "@/types/gateway";

export type OperationField = {
  name: string;
  label: string;
  type: "text" | "number" | "textarea";
  required: boolean;
  description: string;
};

export type OperationDefinition = {
  id: MpesaOperation;
  label: string;
  method: "GET" | "POST";
  route: string;
  description: string;
  moneyMoving: boolean;
  fields: OperationField[];
};

export const operationCatalog: OperationDefinition[] = [
  {
    id: "oauthToken",
    label: "OAuth Token",
    method: "GET",
    route: "/api/mpesa/oauth/token",
    description: "Tests Safaricom OAuth and shows token cache health.",
    moneyMoving: false,
    fields: [],
  },
  {
    id: "stkPush",
    label: "STK Push",
    method: "POST",
    route: "/api/mpesa/stk-push",
    description: "Prompts a customer handset for payment approval.",
    moneyMoving: true,
    fields: [
      { name: "phoneNumber", label: "Phone number", type: "text", required: true, description: "Kenyan MSISDN." },
      { name: "amount", label: "Amount", type: "number", required: true, description: "Charge amount." },
      {
        name: "accountReference",
        label: "Account reference",
        type: "text",
        required: true,
        description: "Up to 12 alphanumeric characters after sanitization.",
      },
      {
        name: "transactionDesc",
        label: "Transaction description",
        type: "text",
        required: true,
        description: "Up to 13 alphanumeric characters after sanitization.",
      },
      {
        name: "transactionType",
        label: "Transaction type",
        type: "text",
        required: false,
        description: "CustomerPayBillOnline or CustomerBuyGoodsOnline.",
      },
    ],
  },
  {
    id: "stkQuery",
    label: "STK Query",
    method: "POST",
    route: "/api/mpesa/stk-query",
    description: "Queries an existing STK request by CheckoutRequestID.",
    moneyMoving: false,
    fields: [
      {
        name: "checkoutRequestId",
        label: "Checkout request ID",
        type: "text",
        required: true,
        description: "The earlier STK push CheckoutRequestID.",
      },
    ],
  },
  {
    id: "c2bRegister",
    label: "C2B Register URLs",
    method: "POST",
    route: "/api/mpesa/c2b/register",
    description: "Registers validation and confirmation URLs for C2B.",
    moneyMoving: false,
    fields: [
      {
        name: "responseType",
        label: "Response type",
        type: "text",
        required: false,
        description: "Completed or Cancelled.",
      },
    ],
  },
  {
    id: "c2bSimulate",
    label: "C2B Simulate",
    method: "POST",
    route: "/api/mpesa/c2b/simulate",
    description: "Simulates a C2B payment in sandbox.",
    moneyMoving: true,
    fields: [
      { name: "amount", label: "Amount", type: "number", required: true, description: "Simulation amount." },
      { name: "phoneNumber", label: "Phone number", type: "text", required: true, description: "Customer MSISDN." },
      {
        name: "billRefNumber",
        label: "Bill reference",
        type: "text",
        required: true,
        description: "Application reference.",
      },
      {
        name: "commandId",
        label: "Command ID",
        type: "text",
        required: false,
        description: "Usually CustomerPayBillOnline.",
      },
      {
        name: "shortcode",
        label: "Shortcode override",
        type: "text",
        required: false,
        description: "Optional sandbox shortcode override.",
      },
    ],
  },
  {
    id: "b2c",
    label: "B2C",
    method: "POST",
    route: "/api/mpesa/b2c",
    description: "Sends funds from the organization to a customer wallet.",
    moneyMoving: true,
    fields: [
      { name: "phoneNumber", label: "Phone number", type: "text", required: true, description: "Recipient MSISDN." },
      { name: "amount", label: "Amount", type: "number", required: true, description: "Disbursement amount." },
      { name: "remarks", label: "Remarks", type: "textarea", required: true, description: "Operational remarks." },
      {
        name: "commandId",
        label: "Command ID",
        type: "text",
        required: false,
        description: "BusinessPayment, SalaryPayment, or PromotionPayment.",
      },
      { name: "occasion", label: "Occasion", type: "text", required: false, description: "Business note." },
      {
        name: "originatorConversationId",
        label: "Originator conversation ID",
        type: "text",
        required: false,
        description: "Optional caller-supplied idempotent provider reference.",
      },
    ],
  },
  {
    id: "b2b",
    label: "B2B",
    method: "POST",
    route: "/api/mpesa/b2b",
    description: "Transfers funds between business shortcodes.",
    moneyMoving: true,
    fields: [
      {
        name: "receiverShortcode",
        label: "Receiver shortcode",
        type: "text",
        required: true,
        description: "Destination shortcode.",
      },
      { name: "amount", label: "Amount", type: "number", required: true, description: "Transfer amount." },
      { name: "remarks", label: "Remarks", type: "textarea", required: true, description: "Operational remarks." },
      {
        name: "commandId",
        label: "Command ID",
        type: "text",
        required: false,
        description: "BusinessPayBill or related command.",
      },
      {
        name: "accountReference",
        label: "Account reference",
        type: "text",
        required: false,
        description: "Internal settlement reference.",
      },
      {
        name: "senderIdentifierType",
        label: "Sender identifier type",
        type: "text",
        required: false,
        description: "Defaults to 4.",
      },
      {
        name: "receiverIdentifierType",
        label: "Receiver identifier type",
        type: "text",
        required: false,
        description: "Defaults to 4.",
      },
    ],
  },
  {
    id: "businessToPochi",
    label: "Business to Pochi",
    method: "POST",
    route: "/api/mpesa/business-to-pochi",
    description: "Uses the B2Pochi payout product for merchant-wallet disbursement.",
    moneyMoving: true,
    fields: [
      { name: "phoneNumber", label: "Phone number", type: "text", required: true, description: "Recipient MSISDN." },
      { name: "amount", label: "Amount", type: "number", required: true, description: "Disbursement amount." },
      { name: "remarks", label: "Remarks", type: "textarea", required: true, description: "Operational remarks." },
      { name: "commandId", label: "Command ID", type: "text", required: false, description: "Usually BusinessPayToPochi." },
      { name: "occasion", label: "Occasion", type: "text", required: false, description: "Optional note." },
      { name: "originatorConversationId", label: "Originator conversation ID", type: "text", required: false, description: "Optional tracking identifier." },
    ],
  },
  {
    id: "dynamicQrCode",
    label: "Dynamic QRCode",
    method: "POST",
    route: "/api/mpesa/dynamic-qrcode",
    description: "Generates a dynamic M-Pesa QR code from an approved Daraja payload.",
    moneyMoving: false,
    fields: [
      {
        name: "payload",
        label: "Payload",
        type: "textarea",
        required: true,
        description: "JSON object sent to Safaricom. Example fields include MerchantName, RefNo, Amount, and QRType.",
      },
      {
        name: "pathOverride",
        label: "Path override",
        type: "text",
        required: false,
        description: "Optional relative M-Pesa path if Safaricom enabled a non-default QR route.",
      },
    ],
  },
  {
    id: "billManager",
    label: "Bill Manager",
    method: "POST",
    route: "/api/mpesa/bill-manager",
    description: "Passes through an approved Bill Manager payload to the configured invoice endpoint.",
    moneyMoving: false,
    fields: [
      {
        name: "payload",
        label: "Payload",
        type: "textarea",
        required: true,
        description: "JSON object for the Bill Manager action you have been enabled for.",
      },
      {
        name: "pathOverride",
        label: "Path override",
        type: "text",
        required: false,
        description: "Optional relative Bill Manager path for actions like bulk cancel, reminders, or acknowledgements.",
      },
    ],
  },
  {
    id: "pullTransactions",
    label: "Pull Transactions",
    method: "POST",
    route: "/api/mpesa/pull-transactions",
    description: "Queries or registers Pull Transactions using a raw Daraja payload.",
    moneyMoving: false,
    fields: [
      {
        name: "payload",
        label: "Payload",
        type: "textarea",
        required: true,
        description: "JSON object for the pull query or registration request.",
      },
      {
        name: "pathOverride",
        label: "Path override",
        type: "text",
        required: false,
        description: "Optional relative path such as /pulltransactions/v1/register when you need the registration call.",
      },
    ],
  },
  {
    id: "mobileNumberValidation",
    label: "Mobile Number Validation",
    method: "POST",
    route: "/api/mpesa/mobile-number-validation",
    description: "Passes through the approved identity or SIM-check payload for your Daraja setup.",
    moneyMoving: false,
    fields: [
      {
        name: "payload",
        label: "Payload",
        type: "textarea",
        required: true,
        description: "JSON object for the mobile validation request approved by Safaricom.",
      },
      {
        name: "pathOverride",
        label: "Path override",
        type: "text",
        required: false,
        description: "Optional relative mobile-validation path when your product uses a different ATI or identity route.",
      },
    ],
  },
  {
    id: "transactionStatus",
    label: "Transaction Status",
    method: "POST",
    route: "/api/mpesa/transaction-status",
    description: "Queries the status of an existing M-Pesa transaction.",
    moneyMoving: false,
    fields: [
      { name: "transactionId", label: "Transaction ID", type: "text", required: true, description: "Provider transaction identifier." },
      { name: "remarks", label: "Remarks", type: "text", required: false, description: "Reason for the status check." },
      { name: "occasion", label: "Occasion", type: "text", required: false, description: "Optional note." },
      { name: "identifierType", label: "Identifier type", type: "text", required: false, description: "Defaults to 4." },
      { name: "commandId", label: "Command ID", type: "text", required: false, description: "Defaults to TransactionStatusQuery." },
    ],
  },
  {
    id: "reversal",
    label: "Reversal",
    method: "POST",
    route: "/api/mpesa/reversal",
    description: "Requests a reversal for an existing M-Pesa transaction.",
    moneyMoving: true,
    fields: [
      { name: "transactionId", label: "Transaction ID", type: "text", required: true, description: "Original transaction identifier." },
      { name: "amount", label: "Amount", type: "number", required: true, description: "Reversal amount." },
      { name: "remarks", label: "Remarks", type: "textarea", required: true, description: "Reason for reversal." },
      { name: "occasion", label: "Occasion", type: "text", required: false, description: "Optional note." },
      { name: "receiverParty", label: "Receiver party", type: "text", required: false, description: "Defaults to the configured shortcode." },
      { name: "receiverIdentifierType", label: "Receiver identifier type", type: "text", required: false, description: "Defaults to 11." },
      { name: "commandId", label: "Command ID", type: "text", required: false, description: "Defaults to TransactionReversal." },
    ],
  },
  {
    id: "accountBalance",
    label: "Account Balance",
    method: "POST",
    route: "/api/mpesa/account-balance",
    description: "Requests the balance for the configured shortcode.",
    moneyMoving: false,
    fields: [
      { name: "remarks", label: "Remarks", type: "text", required: false, description: "Reason for balance query." },
      { name: "identifierType", label: "Identifier type", type: "text", required: false, description: "Defaults to 4." },
      { name: "commandId", label: "Command ID", type: "text", required: false, description: "Defaults to AccountBalance." },
    ],
  },
  {
    id: "ratiba",
    label: "Ratiba",
    method: "POST",
    route: "/api/mpesa/ratiba",
    description: "Passes through a Ratiba standing order payload.",
    moneyMoving: false,
    fields: [
      {
        name: "payload",
        label: "Payload",
        type: "textarea",
        required: true,
        description: "Raw Ratiba request body. CallBackURL is injected if omitted.",
      },
    ],
  },
];

export function getOperationDefinition(operation: MpesaOperation) {
  const definition = operationCatalog.find((item) => item.id === operation);
  if (!definition) {
    throw new Error(`Unknown M-Pesa operation: ${operation}`);
  }

  return definition;
}
