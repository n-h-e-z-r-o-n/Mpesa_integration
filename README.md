# M-Pesa Integration Gateway

A production-ready multi-language integration gateway for Safaricom's M-Pesa APIs. This repository contains complete, robust implementations in **Python (FastAPI)**, **Node.js (Next.js)**, and **Native PHP**. 

The gateway is designed to act as an internal microservice or standalone backend that handles the complexities of the M-Pesa Daraja API—including automatic OAuth token management, exponential backoffs, `401 Unauthorized` token refresh handling, and webhook payload archiving.

## Architecture Overview

All three implementations share an identical architectural pattern to ensure consistency across infrastructure:

1. **Internal API Protection**: All REST endpoints are secured via an `x-api-key` header to prevent unauthorized access.
2. **SDK Layer**: A core class/module that abstracts raw Safaricom HTTP requests, handles strict phone number normalization, timestamp generation, and password hashing.
3. **Webhook Listeners**: Dedicated callback routes that intercept asynchronous Safaricom responses (e.g., STK push completions), validate the payloads, and archive them locally.
4. **Environment Configuration**: A `.env` driven configuration layer that gracefully falls back to sensible defaults.

## Available Endpoints

The gateway exposes the following internal endpoints mapped directly to M-Pesa services. (Note: In Node.js, these are prefixed with `/api/mpesa/`, in Python `/api/v1/mpesa/`, and in PHP `/api/mpesa/`).

| Endpoint | Method | Description |
|---|---|---|
| `/stk-push` | POST | Initiates Lipa Na M-Pesa Online Payment (STK Push). |
| `/stk-query` | POST | Queries the completion status of an STK Push. |
| `/c2b/register` | POST | Registers C2B Validation and Confirmation URLs. |
| `/c2b/simulate` | POST | Simulates a C2B payment to a Paybill/Till. |
| `/b2c` | POST | Sends a B2C payment (Business to Customer). |
| `/b2b` | POST | Sends a B2B payment (Business to Business). |
| `/transaction-status`| POST | Queries the status of an existing transaction. |
| `/reversal` | POST | Initiates a transaction reversal. |
| `/account-balance` | POST | Queries the account balance of a shortcode. |
| `/ratiba` | POST | Creates a Ratiba standing order. |
| `/dynamic-qrcode/generate` | POST | Generates a dynamic M-Pesa QR code for payments. |
| `/bill-manager/...` | POST | Complete suite for Bill Manager invoicing and opt-ins. |
| `/pull-transactions/...`| POST | Suite for querying and registering pull transactions. |

## Quick Start

### 1. Environment Setup

Duplicate the `.env.example` file in your language directory of choice and rename it to `.env`. Update the sandbox/production keys:

```ini
MPESA_CONSUMER_KEY=your-consumer-key
MPESA_CONSUMER_SECRET=your-consumer-secret
MPESA_SHORTCODE=your-shortcode
MPESA_PASSKEY=your-passkey
INTERNAL_API_KEY=your-secure-internal-key
```

### 2. Running the Servers

#### Python (FastAPI)
```bash
cd python
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*Interactive Documentation available at: `http://localhost:8000/docs`*

#### Node.js (Next.js)
```bash
cd nodejs
npm install
npm run dev
```
*Interactive Documentation available at: `http://localhost:3000`*

#### PHP (Native)
```bash
cd php
php -S localhost:8000 index.php
```
*Interactive Documentation available at: `http://localhost:8000`*

## Usage

Requests to the gateway must include your internal API key. 

**Example: Initiating an STK Push**
```bash
curl -X POST http://localhost:3000/api/mpesa/stk-push \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-secure-internal-key" \
  -d '{
    "phone_number": "254712345678",
    "amount": 100,
    "account_reference": "INV-001",
    "transaction_desc": "Payment for INV-001"
  }'
```

## Webhooks (Callbacks)

Safaricom processes transactions asynchronously. The gateway automatically exposes callback endpoints at `/callbacks/payments/...` and archives incoming transaction results to a local `callback_data` directory. When deploying to production, point your Safaricom application's webhook URLs to your public domain's `/callbacks/payments/...` routes.
