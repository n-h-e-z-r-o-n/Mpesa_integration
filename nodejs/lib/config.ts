export const config = {
  appName: process.env.APP_NAME || "Company Payment Gateway",
  appEnv: process.env.APP_ENV || "development",
  logLevel: process.env.LOG_LEVEL || "INFO",
  internalApiKey: process.env.INTERNAL_API_KEY || "",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "",

  mpesa: {
    baseUrl: process.env.MPESA_BASE_URL || "https://sandbox.safaricom.co.ke",
    consumerKey: process.env.MPESA_CONSUMER_KEY || "",
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || "",
    shortcode: process.env.MPESA_SHORTCODE || "",
    tillNo: process.env.MPESA_TILL_NO || "",
    passkey: process.env.MPESA_PASSKEY || "",
    initiatorName: process.env.MPESA_INITIATOR_NAME || "",
    securityCredential: process.env.MPESA_SECURITY_CREDENTIAL || "",

    httpConnectTimeout: parseFloat(process.env.HTTP_CONNECT_TIMEOUT || "5"),
    httpReadTimeout: parseFloat(process.env.HTTP_READ_TIMEOUT || "30"),

    paths: {
      auth: process.env.MPESA_AUTH_PATH || "/oauth/v1/generate?grant_type=client_credentials",
      stkPush: process.env.MPESA_STK_PUSH_PATH || "/mpesa/stkpush/v1/processrequest",
      stkQuery: process.env.MPESA_STK_QUERY_PATH || "/mpesa/stkpushquery/v1/query",
      c2bRegister: process.env.MPESA_C2B_REGISTER_PATH || "/mpesa/c2b/v2/registerurl",
      c2bSimulate: process.env.MPESA_C2B_SIMULATE_PATH || "/mpesa/c2b/v1/simulate",
      b2c: process.env.MPESA_B2C_PATH || "/mpesa/b2c/v3/paymentrequest",
      b2pochi: process.env.MPESA_B2POCHI_PATH || "/mpesa/b2pochi/v1/paymentrequest",
      b2b: process.env.MPESA_B2B_PATH || "/mpesa/b2b/v3/paymentrequest",
      dynamicQrcode: process.env.MPESA_DYNAMIC_QRCODE_PATH || "/mpesa/qrcode/v1/generate",
      billManager: process.env.MPESA_BILL_MANAGER_PATH || "/v1/billmanager-invoice/create-single-invoice",
      pullTransactionsQuery: process.env.MPESA_PULL_TRANSACTIONS_QUERY_PATH || "/pulltransactions/v1/query",
      pullTransactionsRegister: process.env.MPESA_PULL_TRANSACTIONS_REGISTER_PATH || "/pulltransactions/v1/register",
      mobileNumberValidation: process.env.MPESA_MOBILE_NUMBER_VALIDATION_PATH || "/imsi/v2/checkATI",
      transactionStatus: process.env.MPESA_TRANSACTION_STATUS_PATH || "/mpesa/transactionstatus/v1/query",
      reversal: process.env.MPESA_REVERSAL_PATH || "/mpesa/reversal/v1/request",
      accountBalance: process.env.MPESA_ACCOUNT_BALANCE_PATH || "/mpesa/accountbalance/v1/query",
      ratiba: process.env.MPESA_RATIBA_PATH || "/standingorder/v1/createStandingOrderExternal",
      billManagerOptin: process.env.MPESA_BILL_MANAGER_OPTIN_PATH || "/v1/billmanager-invoice/optin",
      billManagerChangeOptin: process.env.MPESA_BILL_MANAGER_CHANGE_OPTIN_DETAILS_PATH || "/v1/billmanager-invoice/change-optin-details",
      billManagerCreateSingleInvoice: process.env.MPESA_BILL_MANAGER_CREATE_SINGLE_INVOICE_PATH || "/v1/billmanager-invoice/create-single-invoice",
      billManagerCreateBulkInvoices: process.env.MPESA_BILL_MANAGER_CREATE_BULK_INVOICES_PATH || "/v1/billmanager-invoice/create-bulk-invoices",
      billManagerCancelSingleInvoice: process.env.MPESA_BILL_MANAGER_CANCEL_SINGLE_INVOICE_PATH || "/v1/billmanager-invoice/cancel-single-invoice",
      billManagerCancelBulkInvoices: process.env.MPESA_BILL_MANAGER_CANCEL_BULK_INVOICES_PATH || "/v1/billmanager-invoice/cancel-bulk-invoices",
      billManagerReconciliation: process.env.MPESA_BILL_MANAGER_RECONCILIATION_PATH || "/v1/billmanager-invoice/reconciliation",
    },

    billManagerDefaults: {
      email: process.env.MPESA_BILL_MANAGER_EMAIL || "",
      officialContact: process.env.MPESA_BILL_MANAGER_OFFICIAL_CONTACT || "",
      sendReminders: parseInt(process.env.MPESA_BILL_MANAGER_SEND_REMINDERS || "1", 10),
      logo: process.env.MPESA_BILL_MANAGER_LOGO || "",
    },

    pullTransactionsDefaults: {
      requestType: process.env.MPESA_PULL_TRANSACTIONS_REQUEST_TYPE || "Pull",
      nominatedNumber: process.env.MPESA_PULL_TRANSACTIONS_NOMINATED_NUMBER || "",
    },

    urls: {
      stkCallback: process.env.MPESA_STK_CALLBACK_URL || "",
      c2bConfirmation: process.env.MPESA_C2B_CONFIRMATION_URL || "",
      c2bValidation: process.env.MPESA_C2B_VALIDATION_URL || "",
      b2cResult: process.env.MPESA_B2C_RESULT_URL || "",
      b2cTimeout: process.env.MPESA_B2C_TIMEOUT_URL || "",
      b2bResult: process.env.MPESA_B2B_RESULT_URL || "",
      b2bTimeout: process.env.MPESA_B2B_TIMEOUT_URL || "",
      transactionStatusResult: process.env.MPESA_TRANSACTION_STATUS_RESULT_URL || "",
      transactionStatusTimeout: process.env.MPESA_TRANSACTION_STATUS_TIMEOUT_URL || "",
      reversalResult: process.env.MPESA_REVERSAL_RESULT_URL || "",
      reversalTimeout: process.env.MPESA_REVERSAL_TIMEOUT_URL || "",
      accountBalanceResult: process.env.MPESA_ACCOUNT_BALANCE_RESULT_URL || "",
      accountBalanceTimeout: process.env.MPESA_ACCOUNT_BALANCE_TIMEOUT_URL || "",
      ratibaCallback: process.env.MPESA_RATIBA_CALLBACK_URL || "",
      billManagerCallback: process.env.MPESA_BILL_MANAGER_CALLBACK_URL || "",
      pullTransactionsCallback: process.env.MPESA_PULL_TRANSACTIONS_CALLBACK_URL || "",
    }
  }
};

const buildUrl = (base: string, path: string) => {
  if (!base) return "";
  return `${base.replace(/\/+$/, '')}${path}`;
};

export const getCallbackUrl = (key: keyof typeof config.mpesa.urls, path: string) => {
  return config.mpesa.urls[key] || buildUrl(config.publicBaseUrl, path);
};
