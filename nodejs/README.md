# Zadhron Payments Gateway

Production-oriented Next.js payment gateway and internal operations console for `payments.zadhron.com`.

## Scope

- Preserves the Python M-Pesa reference behavior under `../python`
- Ports the M-Pesa flows into Node.js route handlers and shared services
- Provides an internal admin console for live inspection and request testing
- Keeps application authentication separate from administrator login

## Stack

- Next.js App Router
- TypeScript
- Node.js runtime for payment and callback routes
- Tailwind CSS 4
- Zod validation
- Vitest for critical non-UI tests

## Key Routes

- `GET /api/health`
- `GET /api/mpesa/oauth/token`
- `POST /api/mpesa/stk-push`
- `POST /api/mpesa/stk-query`
- `POST /api/mpesa/c2b/register`
- `POST /api/mpesa/c2b/simulate`
- `POST /api/mpesa/b2c`
- `POST /api/mpesa/b2b`
- `POST /api/mpesa/business-to-pochi`
- `POST /api/mpesa/dynamic-qrcode`
- `POST /api/mpesa/bill-manager`
- `POST /api/mpesa/pull-transactions`
- `POST /api/mpesa/mobile-number-validation`
- `POST /api/mpesa/transaction-status`
- `POST /api/mpesa/reversal`
- `POST /api/mpesa/account-balance`
- `POST /api/mpesa/ratiba`

Callback compatibility is exposed at both:

- `/api/mpesa/callbacks/...`
- `/callbacks/payments/...`

## Environment

Copy `.env.example` to `.env.local` and provide real values.

For the intended `payments.zadhron.com` deployment, use `MPESA_ENVIRONMENT=production` unless you are deliberately running a separate sandbox setup.

Important:

- `ADMIN_*` values protect the internal console
- `GATEWAY_APPLICATIONS_JSON` configures consuming Zadhron applications and scopes
- `MPESA_SECURITY_CREDENTIAL` can be provided directly
- or the app can derive it from `MPESA_INITIATOR_PASSWORD` and `MPESA_CERTIFICATE_PATH`

## Scripts

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

## Notes

- Runtime logs, transactions, callbacks, and idempotency records are currently in-memory only
- Persistence boundaries are intentionally isolated for later PostgreSQL or Supabase integration
- The Python implementation remains untouched as the reference behavior source
