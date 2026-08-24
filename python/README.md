# M-Pesa Gateway API

This project is a simple Python FastAPI gateway for Safaricom Daraja M-Pesa integrations.

All code is stored locally in this folder:

- `C:\Users\user\Desktop\Kotlin Apps\Mpesa_integration`

The Python API code lives here:

- `C:\Users\user\Desktop\Kotlin Apps\Mpesa_integration\python`

## Project Structure

- `python/main.py`: local entrypoint for running the API
- `python/app/main.py`: FastAPI app setup
- `python/app/api/mpesa.py`: internal M-Pesa API routes
- `python/app/callbacks/mpesa.py`: callback endpoints for Safaricom
- `python/app/providers/mpesa/`: one M-Pesa capability per file
- `python/.env`: your local credentials and callback URLs
- `python/.env.example`: sample env template

## M-Pesa Modules

Each provider capability is in its own file:

- `auth.py`: OAuth token generation
- `stk_push.py`: STK Push request
- `stk_query.py`: STK Push status query
- `c2b_register.py`: register validation and confirmation URLs
- `c2b_simulate.py`: sandbox C2B simulation
- `b2c.py`: B2C payouts
- `b2b.py`: B2B payments
- `transaction_status.py`: transaction status query
- `reversal.py`: reversal request
- `account_balance.py`: account balance query

## Environment Setup

Edit this file before running the API:

- `C:\Users\user\Desktop\Kotlin Apps\Mpesa_integration\python\.env`

### Required `.env` Fields

`APP_NAME`
- Display name of the API.
- Example: `Company Payment Gateway`

`APP_ENV`
- Your environment name.
- Typical values: `development`, `staging`, `production`

`LOG_LEVEL`
- Logging level for the API.
- Typical values: `INFO`, `DEBUG`, `WARNING`

`INTERNAL_API_KEY`
- Secret key your own internal systems must send in the `x-api-key` header.
- If this is wrong or missing, protected routes will reject the request.

`PUBLIC_BASE_URL`
- Public HTTPS domain where Safaricom can reach your callbacks.
- Example: `https://payments.yourcompany.com`

`MPESA_BASE_URL`
- Safaricom environment base URL.
- Sandbox: `https://sandbox.safaricom.co.ke`
- Production: `https://api.safaricom.co.ke`

`MPESA_CONSUMER_KEY`
- Daraja app consumer key from Safaricom.

`MPESA_CONSUMER_SECRET`
- Daraja app consumer secret from Safaricom.

`MPESA_SHORTCODE`
- Your paybill, till, or organization shortcode used by the API product you are testing.

`MPESA_PASSKEY`
- Lipa na M-Pesa Online passkey.
- Needed for STK Push and STK query.

`MPESA_INITIATOR_NAME`
- Initiator username used for API operations like B2C, B2B, reversal, account balance, and transaction status.
- Leave blank only if you are testing STK or C2B-only flows.

`MPESA_SECURITY_CREDENTIAL`
- Encrypted initiator credential provided for sensitive Daraja APIs.
- Required for B2C, B2B, reversal, transaction status, and account balance.

`HTTP_CONNECT_TIMEOUT`
- Timeout in seconds for opening outbound connections to Safaricom.

`HTTP_READ_TIMEOUT`
- Timeout in seconds for waiting on the full Safaricom response.

### Callback URL Fields

These are the exact URLs Safaricom uses for asynchronous responses. They must be publicly reachable if you are testing with the real Daraja platform.

`MPESA_STK_CALLBACK_URL`
- Callback for STK Push results.

`MPESA_C2B_CONFIRMATION_URL`
- C2B confirmation callback.

`MPESA_C2B_VALIDATION_URL`
- C2B validation callback.

`MPESA_B2C_PATH`
- B2C request path used after OAuth succeeds.
- Default: `/mpesa/b2c/v3/paymentrequest`
- If Daraja returns `Invalid Access Token - Invalid API call as no apiproduct match found`, your consumer key and secret may be subscribed to a different B2C product path such as `/mpesa/b2c/v1/paymentrequest`.

`MPESA_B2C_RESULT_URL`
- B2C success or processing result callback.

`MPESA_B2C_TIMEOUT_URL`
- B2C timeout callback.

`MPESA_B2B_RESULT_URL`
- B2B result callback.

`MPESA_B2B_TIMEOUT_URL`
- B2B timeout callback.

`MPESA_TRANSACTION_STATUS_RESULT_URL`
- Transaction status result callback.

`MPESA_TRANSACTION_STATUS_TIMEOUT_URL`
- Transaction status timeout callback.

`MPESA_REVERSAL_RESULT_URL`
- Reversal result callback.

`MPESA_REVERSAL_TIMEOUT_URL`
- Reversal timeout callback.

`MPESA_ACCOUNT_BALANCE_RESULT_URL`
- Account balance result callback.

`MPESA_ACCOUNT_BALANCE_TIMEOUT_URL`
- Account balance timeout callback.

## Example `.env`

```env
APP_NAME=Company Payment Gateway
APP_ENV=development
LOG_LEVEL=INFO
INTERNAL_API_KEY=change-me
PUBLIC_BASE_URL=https://your-domain.com

MPESA_BASE_URL=https://sandbox.safaricom.co.ke
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=174379
MPESA_PASSKEY=your-passkey
MPESA_INITIATOR_NAME=your-initiator-name
MPESA_SECURITY_CREDENTIAL=your-security-credential

HTTP_CONNECT_TIMEOUT=5
HTTP_READ_TIMEOUT=30

MPESA_STK_CALLBACK_URL=https://your-domain.com/callbacks/mpesa/stk
MPESA_C2B_CONFIRMATION_URL=https://your-domain.com/callbacks/mpesa/c2b/confirmation
MPESA_C2B_VALIDATION_URL=https://your-domain.com/callbacks/mpesa/c2b/validation
MPESA_B2C_PATH=/mpesa/b2c/v3/paymentrequest
MPESA_B2C_RESULT_URL=https://your-domain.com/callbacks/mpesa/b2c/result
MPESA_B2C_TIMEOUT_URL=https://your-domain.com/callbacks/mpesa/b2c/timeout
MPESA_B2B_RESULT_URL=https://your-domain.com/callbacks/mpesa/b2b/result
MPESA_B2B_TIMEOUT_URL=https://your-domain.com/callbacks/mpesa/b2b/timeout
MPESA_TRANSACTION_STATUS_RESULT_URL=https://your-domain.com/callbacks/mpesa/transaction-status/result
MPESA_TRANSACTION_STATUS_TIMEOUT_URL=https://your-domain.com/callbacks/mpesa/transaction-status/timeout
MPESA_REVERSAL_RESULT_URL=https://your-domain.com/callbacks/mpesa/reversal/result
MPESA_REVERSAL_TIMEOUT_URL=https://your-domain.com/callbacks/mpesa/reversal/timeout
MPESA_ACCOUNT_BALANCE_RESULT_URL=https://your-domain.com/callbacks/mpesa/account-balance/result
MPESA_ACCOUNT_BALANCE_TIMEOUT_URL=https://your-domain.com/callbacks/mpesa/account-balance/timeout
```

## Install Dependencies

Open PowerShell in:

- `C:\Users\user\Desktop\Kotlin Apps\Mpesa_integration\python`

Then run:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

## Run The API

From the `python` folder run:

```powershell
.\.venv\Scripts\python.exe main.py
```

Once the app is running:

- Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

## Authentication For Internal Routes

All internal M-Pesa routes require this header:

```text
x-api-key: your INTERNAL_API_KEY value
```

If the header is missing or wrong, the API will reject the request.

## API Test Cases

Base URL for local testing:

```text
http://127.0.0.1:8000
```

Use your real internal API key in the examples below.

### 1. Health Check

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://127.0.0.1:8000/health"
```

Expected:

```json
{"status":"ok"}
```

### 2. Get OAuth Token

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://127.0.0.1:8000/api/v1/mpesa/token" `
  -Headers @{ "x-api-key" = "change-me" }
```

Expected:

- Returns an `access_token` if `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` are correct.

### 3. STK Push

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/mpesa/stk-push" `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body '{
    "phone_number": "2547XXXXXXXX",
    "amount": 1,
    "account_reference": "INV-1001",
    "transaction_desc": "Test payment"
  }'
```

Expected:

- Safaricom accepts the request and returns `ResponseCode: "0"` when credentials and passkey are valid.

### 4. STK Query

Use the `CheckoutRequestID` returned by STK Push.

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/mpesa/stk-query" `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body '{
    "checkout_request_id": "ws_CO_123456789"
  }'
```

### 5. Register C2B URLs

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/mpesa/c2b/register" `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body '{
    "response_type": "Completed"
  }'
```

Expected:

- Safaricom registers your validation and confirmation URLs.

### 6. Simulate C2B Payment

This is normally for sandbox testing only.

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/mpesa/c2b/simulate" `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body '{
    "amount": 10,
    "phone_number": "2547XXXXXXXX",
    "bill_ref_number": "TEST-REF-1"
  }'
```

### 7. B2C Payment

This requires:

- `MPESA_INITIATOR_NAME`
- `MPESA_SECURITY_CREDENTIAL`
- B2C enabled on your Daraja account
- A Daraja app whose consumer key and secret are subscribed to the B2C product path in `MPESA_B2C_PATH`

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/mpesa/b2c" `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body '{
    "phone_number": "2547XXXXXXXX",
    "amount": 10,
    "remarks": "Salary test",
    "command_id": "BusinessPayment",
    "occasion": "August payout"
  }'
```

### 8. B2B Payment

This requires:

- `MPESA_INITIATOR_NAME`
- `MPESA_SECURITY_CREDENTIAL`
- B2B enabled on your Daraja account

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/mpesa/b2b" `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body '{
    "receiver_shortcode": "600000",
    "amount": 10,
    "remarks": "B2B test",
    "command_id": "BusinessPayBill",
    "account_reference": "B2B-TEST"
  }'
```

### 9. Transaction Status Query

Use a real M-Pesa transaction ID.

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/mpesa/transaction-status" `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body '{
    "transaction_id": "OEI2AK4Q16",
    "remarks": "Status check",
    "occasion": "Audit"
  }'
```

### 10. Reversal

Use a real reversible M-Pesa transaction.

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/mpesa/reversal" `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body '{
    "transaction_id": "OEI2AK4Q16",
    "amount": 10,
    "remarks": "Reversal test",
    "occasion": "Correction"
  }'
```

### 11. Account Balance

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/mpesa/account-balance" `
  -Headers @{ "x-api-key" = "change-me" } `
  -ContentType "application/json" `
  -Body '{
    "remarks": "Balance check"
  }'
```

## Callback Test Cases

These callback endpoints are available locally:

- `/callbacks/mpesa/stk`
- `/callbacks/mpesa/c2b/confirmation`
- `/callbacks/mpesa/c2b/validation`
- `/callbacks/mpesa/b2c/result`
- `/callbacks/mpesa/b2c/timeout`
- `/callbacks/mpesa/b2b/result`
- `/callbacks/mpesa/b2b/timeout`
- `/callbacks/mpesa/transaction-status/result`
- `/callbacks/mpesa/transaction-status/timeout`
- `/callbacks/mpesa/reversal/result`
- `/callbacks/mpesa/reversal/timeout`
- `/callbacks/mpesa/account-balance/result`
- `/callbacks/mpesa/account-balance/timeout`

You can locally test a callback route with:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/callbacks/mpesa/stk" `
  -ContentType "application/json" `
  -Body '{
    "Body": {
      "stkCallback": {
        "MerchantRequestID": "12345",
        "CheckoutRequestID": "ws_CO_12345",
        "ResultCode": 0,
        "ResultDesc": "The service request is processed successfully."
      }
    }
  }'
```

Expected:

```json
{
  "ResultCode": 0,
  "ResultDesc": "Accepted"
}
```

## Daraja Callback IP Whitelist

Based on the Daraja note you shared, Safaricom callback traffic may come from these IP addresses:

- `196.201.214.200`
- `196.201.214.206`
- `196.201.213.114`
- `196.201.214.207`
- `196.201.214.208`
- `196.201.213.44`
- `196.201.212.127`
- `196.201.212.138`
- `196.201.212.129`
- `196.201.212.136`
- `196.201.212.74`
- `196.201.212.69`

If your server, firewall, reverse proxy, WAF, or cloud platform restricts inbound traffic, allow these IPs to reach your callback routes.

Typical places to whitelist them:

- Railway or platform edge rules
- Nginx or Apache reverse proxy rules
- Cloud firewall rules
- VPS firewall rules such as `ufw` or provider security groups

Important:

- Use this list as a Daraja callback allowlist reference from the note you found.
- If Safaricom changes the callback source IPs later, your firewall rules will need to be updated too.
- Do not block your own local testing traffic while developing on `localhost`.

## Practical Testing Order

Use this order to avoid confusion:

1. Fill `python/.env`
2. Run the API
3. Test `/health`
4. Test `/api/v1/mpesa/token`
5. Test `stk-push`
6. Test `stk-query`
7. Register C2B URLs
8. Simulate C2B if you are in sandbox
9. Test B2C, B2B, reversal, transaction status, and account balance only after Safaricom has enabled those products for your account

## Common Reasons Tests Fail

- `x-api-key` does not match `INTERNAL_API_KEY`
- `MPESA_BASE_URL` is sandbox while you are using production credentials
- `MPESA_PASSKEY` is wrong
- `MPESA_SHORTCODE` is wrong for the product being tested
- the OAuth app behind `MPESA_CONSUMER_KEY` and `MPESA_CONSUMER_SECRET` is not subscribed to the B2C API product path in `MPESA_B2C_PATH`
- callback URLs are not public HTTPS URLs
- initiator credentials are missing for B2C, B2B, reversal, status, or balance routes
- Daraja product is not enabled on your account

## Local Files To Check

- Root README: `C:\Users\user\Desktop\Kotlin Apps\Mpesa_integration\README.md`
- Env file: `C:\Users\user\Desktop\Kotlin Apps\Mpesa_integration\python\.env`
- API routes: `C:\Users\user\Desktop\Kotlin Apps\Mpesa_integration\python\app\api\mpesa.py`
- Callback routes: `C:\Users\user\Desktop\Kotlin Apps\Mpesa_integration\python\app\callbacks\mpesa.py`
