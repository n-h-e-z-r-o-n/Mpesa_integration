import { config, getCallbackUrl } from './config';

export class MpesaError extends Error {
  statusCode?: number;
  response?: any;

  constructor(message: string, statusCode?: number, response?: any) {
    super(message);
    this.name = 'MpesaError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

let _accessToken: string | null = null;
let _tokenExpiresAt: number = 0;

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_accessToken && now < _tokenExpiresAt) {
    return _accessToken;
  }

  const url = `${config.mpesa.baseUrl.replace(/\/+$/, '')}${config.mpesa.paths.auth}`;
  const credentials = Buffer.from(`${config.mpesa.consumerKey}:${config.mpesa.consumerSecret}`).toString('base64');

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
      signal: AbortSignal.timeout(config.mpesa.httpConnectTimeout * 1000)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new MpesaError(`M-Pesa authentication failed: ${JSON.stringify(data)}`, response.status, data);
    }

    if (!data.access_token) {
      throw new MpesaError('M-Pesa response did not include access_token');
    }

    _accessToken = data.access_token;
    const expiresIn = parseInt(data.expires_in || '3599', 10);
    _tokenExpiresAt = now + (expiresIn - 60) * 1000;

    return _accessToken as string;
  } catch (error: any) {
    throw new MpesaError(`Unable to contact M-Pesa OAuth endpoint: ${error.message}`);
  }
}

export function normalizePhone(phoneNumber: string): string {
  let cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = `254${cleaned.substring(1)}`;
  } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
    cleaned = `254${cleaned}`;
  }
  if (!/^254(7|1)\d{8}$/.test(cleaned)) {
    throw new Error('Invalid Kenyan mobile number');
  }
  return cleaned;
}

export function getNairobiTimestamp(): string {
  const date = new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
  const yyyy = date.getFullYear();
  const MM = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${MM}${dd}${hh}${mm}${ss}`;
}

export function buildStkPassword(timestamp: string): string {
  const rawValue = `${config.mpesa.shortcode}${config.mpesa.passkey}${timestamp}`;
  return Buffer.from(rawValue).toString('base64');
}

async function sendPostRequest(path: string, payload: any, retryOn401 = true): Promise<any> {
  const token = await getAccessToken();
  const url = `${config.mpesa.baseUrl.replace(/\/+$/, '')}${path}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.mpesa.httpReadTimeout * 1000)
    });

    const data = await response.json();

    if (response.status === 401 && retryOn401) {
      _accessToken = null;
      _tokenExpiresAt = 0;
      return sendPostRequest(path, payload, false);
    }

    if (!response.ok) {
      throw new MpesaError('M-Pesa request failed', response.status, data);
    }

    return data;
  } catch (error: any) {
    if (error instanceof MpesaError) throw error;
    throw new MpesaError(`M-Pesa request failed: ${error.message}`);
  }
}

async function sendGetRequest(path: string, params: Record<string, string>, retryOn401 = true): Promise<any> {
  const token = await getAccessToken();
  const queryString = new URLSearchParams(params).toString();
  const url = `${config.mpesa.baseUrl.replace(/\/+$/, '')}${path}?${queryString}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(config.mpesa.httpReadTimeout * 1000)
    });

    const data = await response.json();

    if (response.status === 401 && retryOn401) {
      _accessToken = null;
      _tokenExpiresAt = 0;
      return sendGetRequest(path, params, false);
    }

    if (!response.ok) {
      throw new MpesaError('M-Pesa request failed', response.status, data);
    }

    return data;
  } catch (error: any) {
    if (error instanceof MpesaError) throw error;
    throw new MpesaError(`M-Pesa request failed: ${error.message}`);
  }
}

function requireInitiatorCredentials() {
  if (!config.mpesa.initiatorName || !config.mpesa.securityCredential) {
    throw new Error('MPESA_INITIATOR_NAME and MPESA_SECURITY_CREDENTIAL are required for this endpoint');
  }
  return {
    name: config.mpesa.initiatorName,
    credential: config.mpesa.securityCredential,
  };
}

export async function initiateStkPush({ phone_number, amount, account_reference, transaction_desc, transaction_type = "CustomerPayBillOnline" }: any) {
  const timestamp = getNairobiTimestamp();
  const password = buildStkPassword(timestamp);

  const payload = {
    BusinessShortCode: config.mpesa.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: transaction_type,
    Amount: amount,
    PartyA: normalizePhone(phone_number),
    PartyB: config.mpesa.tillNo || config.mpesa.shortcode,
    PhoneNumber: normalizePhone(phone_number),
    CallBackURL: getCallbackUrl('stkCallback', '/callbacks/payments/stk'),
    AccountReference: account_reference,
    TransactionDesc: transaction_desc,
  };

  return sendPostRequest(config.mpesa.paths.stkPush, payload);
}

export async function queryStkPush(checkout_request_id: string) {
  const timestamp = getNairobiTimestamp();
  const password = buildStkPassword(timestamp);

  const payload = {
    BusinessShortCode: config.mpesa.shortcode,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkout_request_id,
  };

  return sendPostRequest(config.mpesa.paths.stkQuery, payload);
}

export async function registerC2BUrls(response_type = "Completed") {
  const payload = {
    ShortCode: config.mpesa.shortcode,
    ResponseType: response_type,
    ConfirmationURL: getCallbackUrl('c2bConfirmation', '/callbacks/payments/c2b/confirmation'),
    ValidationURL: getCallbackUrl('c2bValidation', '/callbacks/payments/c2b/validation'),
  };
  return sendPostRequest(config.mpesa.paths.c2bRegister, payload);
}

export async function simulateC2BPayment({ amount, phone_number, bill_ref_number, command_id = "CustomerPayBillOnline", shortcode }: any) {
  const payload = {
    CommandID: command_id,
    Amount: amount,
    Msisdn: normalizePhone(phone_number),
    BillRefNumber: bill_ref_number,
    ShortCode: shortcode || config.mpesa.shortcode,
  };
  return sendPostRequest(config.mpesa.paths.c2bSimulate, payload);
}

export async function sendB2CPayment({ phone_number, amount, remarks, command_id = "BusinessPayment", occasion = "", originator_conversation_id }: any) {
  const { name, credential } = requireInitiatorCredentials();

  const payload: any = {
    InitiatorName: name,
    SecurityCredential: credential,
    CommandID: command_id,
    Amount: amount,
    PartyA: config.mpesa.shortcode,
    PartyB: normalizePhone(phone_number),
    Remarks: remarks,
    QueueTimeOutURL: getCallbackUrl('b2cTimeout', '/callbacks/payments/b2c/timeout'),
    ResultURL: getCallbackUrl('b2cResult', '/callbacks/payments/b2c/result'),
    Occasion: occasion,
  };
  if (originator_conversation_id) payload.OriginatorConversationID = originator_conversation_id;

  return sendPostRequest(config.mpesa.paths.b2c, payload);
}

export async function sendB2PochiPayment({ phone_number, amount, remarks, command_id = "BusinessPayToPochi", occasion = "", originator_conversation_id }: any) {
  const { name, credential } = requireInitiatorCredentials();

  const payload: any = {
    InitiatorName: name,
    SecurityCredential: credential,
    CommandID: command_id,
    Amount: amount,
    PartyA: config.mpesa.shortcode,
    PartyB: normalizePhone(phone_number),
    Remarks: remarks,
    QueueTimeOutURL: getCallbackUrl('b2cTimeout', '/callbacks/payments/b2c/timeout'),
    ResultURL: getCallbackUrl('b2cResult', '/callbacks/payments/b2c/result'),
    Occasion: occasion,
  };
  if (originator_conversation_id) payload.OriginatorConversationID = originator_conversation_id;

  return sendPostRequest(config.mpesa.paths.b2pochi, payload);
}

export async function sendB2BPayment({ receiver_shortcode, amount, remarks, command_id = "BusinessPayBill", account_reference = "", sender_identifier_type = "4", receiver_identifier_type = "4" }: any) {
  const { name, credential } = requireInitiatorCredentials();

  const payload = {
    Initiator: name,
    SecurityCredential: credential,
    CommandID: command_id,
    SenderIdentifierType: sender_identifier_type,
    RecieverIdentifierType: receiver_identifier_type,
    Amount: amount,
    PartyA: config.mpesa.shortcode,
    PartyB: receiver_shortcode,
    AccountReference: account_reference,
    Remarks: remarks,
    QueueTimeOutURL: getCallbackUrl('b2bTimeout', '/callbacks/payments/b2b/timeout'),
    ResultURL: getCallbackUrl('b2bResult', '/callbacks/payments/b2b/result'),
  };

  return sendPostRequest(config.mpesa.paths.b2b, payload);
}

export async function queryTransactionStatus({ transaction_id, remarks = "Transaction status query", occasion = "", identifier_type = "4", command_id = "TransactionStatusQuery" }: any) {
  const { name, credential } = requireInitiatorCredentials();

  const payload = {
    Initiator: name,
    SecurityCredential: credential,
    CommandID: command_id,
    TransactionID: transaction_id,
    PartyA: config.mpesa.shortcode,
    IdentifierType: identifier_type,
    ResultURL: getCallbackUrl('transactionStatusResult', '/callbacks/payments/transaction-status/result'),
    QueueTimeOutURL: getCallbackUrl('transactionStatusTimeout', '/callbacks/payments/transaction-status/timeout'),
    Remarks: remarks,
    Occasion: occasion,
  };

  return sendPostRequest(config.mpesa.paths.transactionStatus, payload);
}

export async function reverseTransaction({ transaction_id, amount, remarks, occasion = "", receiver_party, receiver_identifier_type = "11", command_id = "TransactionReversal" }: any) {
  const { name, credential } = requireInitiatorCredentials();

  const payload = {
    Initiator: name,
    SecurityCredential: credential,
    CommandID: command_id,
    TransactionID: transaction_id,
    Amount: amount,
    ReceiverParty: receiver_party || config.mpesa.shortcode,
    RecieverIdentifierType: receiver_identifier_type,
    ResultURL: getCallbackUrl('reversalResult', '/callbacks/payments/reversal/result'),
    QueueTimeOutURL: getCallbackUrl('reversalTimeout', '/callbacks/payments/reversal/timeout'),
    Remarks: remarks,
    Occasion: occasion,
  };

  return sendPostRequest(config.mpesa.paths.reversal, payload);
}

export async function queryAccountBalance({ remarks = "Account balance query", identifier_type = "4", command_id = "AccountBalance" }: any) {
  const { name, credential } = requireInitiatorCredentials();

  const payload = {
    Initiator: name,
    SecurityCredential: credential,
    CommandID: command_id,
    PartyA: config.mpesa.shortcode,
    IdentifierType: identifier_type,
    Remarks: remarks,
    QueueTimeOutURL: getCallbackUrl('accountBalanceTimeout', '/callbacks/payments/account-balance/timeout'),
    ResultURL: getCallbackUrl('accountBalanceResult', '/callbacks/payments/account-balance/result'),
  };

  return sendPostRequest(config.mpesa.paths.accountBalance, payload);
}

export async function createRatibaStandingOrder(payload: any) {
  return sendPostRequest(config.mpesa.paths.ratiba, payload);
}

export async function generateDynamicQrcode(payload: any) {
  return sendPostRequest(config.mpesa.paths.dynamicQrcode, payload);
}

export async function createBillManagerSingleInvoice(payload: any) {
  return sendPostRequest(config.mpesa.paths.billManagerCreateSingleInvoice, payload);
}

export async function createBillManagerBulkInvoices(payload: any) {
  return sendPostRequest(config.mpesa.paths.billManagerCreateBulkInvoices, payload);
}

export async function cancelBillManagerSingleInvoice(payload: any) {
  return sendPostRequest(config.mpesa.paths.billManagerCancelSingleInvoice, payload);
}

export async function cancelBillManagerBulkInvoices(payload: any) {
  return sendPostRequest(config.mpesa.paths.billManagerCancelBulkInvoices, payload);
}

export async function billManagerOptinFromSettings(payload: any) {
  const merged = {
    shortcode: config.mpesa.shortcode,
    email: config.mpesa.billManagerDefaults.email,
    officialContact: config.mpesa.billManagerDefaults.officialContact,
    sendReminders: config.mpesa.billManagerDefaults.sendReminders,
    logo: config.mpesa.billManagerDefaults.logo,
    callbackurl: getCallbackUrl('billManagerCallback', '/callbacks/payments/bill-manager'),
    ...payload,
  };
  return sendPostRequest(config.mpesa.paths.billManagerOptin, merged);
}

export async function changeBillManagerOptinDetailsFromSettings(payload: any) {
  const merged = {
    shortcode: config.mpesa.shortcode,
    email: config.mpesa.billManagerDefaults.email,
    officialContact: config.mpesa.billManagerDefaults.officialContact,
    sendReminders: config.mpesa.billManagerDefaults.sendReminders,
    logo: config.mpesa.billManagerDefaults.logo,
    callbackurl: getCallbackUrl('billManagerCallback', '/callbacks/payments/bill-manager'),
    ...payload,
  };
  return sendPostRequest(config.mpesa.paths.billManagerChangeOptin, merged);
}

export async function reconcileBillManager(payload: any) {
  return sendPostRequest(config.mpesa.paths.billManagerReconciliation, payload);
}

export async function queryPullTransactions(payload: any) {
  return sendPostRequest(config.mpesa.paths.pullTransactionsQuery, payload);
}

export async function registerPullTransactionsFromSettings(payload: any) {
  const merged = {
    ShortCode: config.mpesa.shortcode,
    RequestType: config.mpesa.pullTransactionsDefaults.requestType,
    NominatedNumber: config.mpesa.pullTransactionsDefaults.nominatedNumber,
    CallBackURL: getCallbackUrl('pullTransactionsCallback', '/callbacks/payments/pull-transactions'),
    ...payload,
  };
  return sendPostRequest(config.mpesa.paths.pullTransactionsRegister, merged);
}

export async function checkAtiMobileNumber(payload: any) {
  return sendPostRequest(config.mpesa.paths.mobileNumberValidation, payload);
}
