import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';
import * as mpesa from '@/lib/mpesa';

function verifyInternalApiKey(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== config.internalApiKey) {
    throw new mpesa.MpesaError('Invalid internal API key', 401);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await params;
    const path = slug.join('/');

    if (path === 'token') {
      verifyInternalApiKey(request);
      const token = await mpesa.getAccessToken();
      return NextResponse.json({ access_token: token });
    }

    let payload = {};
    try {
      payload = await request.json();
    } catch (e) {
      if (['bill-manager/optin', 'bill-manager/change-optin-details'].includes(path)) {
        payload = {};
      } else {
        throw new mpesa.MpesaError('Invalid JSON payload', 400);
      }
    }

    verifyInternalApiKey(request);

    let result;

    switch (path) {
      case 'stk-push':
        result = await mpesa.initiateStkPush(payload);
        break;
      case 'stk-query':
        result = await mpesa.queryStkPush((payload as any).checkout_request_id);
        break;
      case 'c2b/register':
        result = await mpesa.registerC2BUrls((payload as any).response_type);
        break;
      case 'c2b/simulate':
        result = await mpesa.simulateC2BPayment(payload);
        break;
      case 'b2c':
        result = await mpesa.sendB2CPayment(payload);
        break;
      case 'b2pochi-prod':
        result = await mpesa.sendB2PochiPayment(payload);
        break;
      case 'b2b':
        result = await mpesa.sendB2BPayment(payload);
        break;
      case 'transaction-status':
        result = await mpesa.queryTransactionStatus(payload);
        break;
      case 'reversal':
        result = await mpesa.reverseTransaction(payload);
        break;
      case 'account-balance':
        result = await mpesa.queryAccountBalance(payload);
        break;
      case 'ratiba':
        result = await mpesa.createRatibaStandingOrder(payload);
        break;
      case 'dynamic-qrcode/generate':
        result = await mpesa.generateDynamicQrcode(payload);
        break;
      case 'bill-manager/invoices/create-single':
        result = await mpesa.createBillManagerSingleInvoice(payload);
        break;
      case 'bill-manager/invoices/create-bulk':
        result = await mpesa.createBillManagerBulkInvoices(payload);
        break;
      case 'bill-manager/invoices/cancel-single':
        result = await mpesa.cancelBillManagerSingleInvoice(payload);
        break;
      case 'bill-manager/invoices/cancel-bulk':
        result = await mpesa.cancelBillManagerBulkInvoices(payload);
        break;
      case 'bill-manager/optin':
        result = await mpesa.billManagerOptinFromSettings(payload);
        break;
      case 'bill-manager/change-optin-details':
        result = await mpesa.changeBillManagerOptinDetailsFromSettings(payload);
        break;
      case 'pull-transactions/query':
        result = await mpesa.queryPullTransactions(payload);
        break;
      case 'pull-transactions/register':
        result = await mpesa.registerPullTransactionsFromSettings(payload);
        break;
      case 'mobile-number-validation/check-ati':
        result = await mpesa.checkAtiMobileNumber(payload);
        break;
      default:
        return NextResponse.json({ detail: 'Endpoint not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof mpesa.MpesaError) {
      if (error.statusCode === 401 && error.message === 'Invalid internal API key') {
        return NextResponse.json({ detail: error.message }, { status: 401 });
      }
      return NextResponse.json({
        message: error.message,
        mpesa_status_code: error.statusCode,
        mpesa_response: error.response,
      }, { status: 502 });
    }
    return NextResponse.json({ detail: error.message }, { status: 400 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await params;
    const path = slug.join('/');

    if (path === 'token') {
      verifyInternalApiKey(request);
      const token = await mpesa.getAccessToken();
      return NextResponse.json({ access_token: token });
    }

    return NextResponse.json({ detail: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    if (error instanceof mpesa.MpesaError) {
      if (error.statusCode === 401) {
        return NextResponse.json({ detail: error.message }, { status: 401 });
      }
      return NextResponse.json({ detail: error.message }, { status: 502 });
    }
    return NextResponse.json({ detail: error.message }, { status: 400 });
  }
}
