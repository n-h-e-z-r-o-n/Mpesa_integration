-- ============================================================
-- ZADHRON PAYMENT GATEWAY
-- Initial Production Database Schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. USERS
-- ============================================================
--
-- Application-level identity.
--
-- IMPORTANT:
-- id is OUR permanent user ID.
-- auth_subject is the authentication provider's user ID.
--
-- This intentionally avoids making auth.users.id the primary key
-- of our application.
--
-- If we leave Supabase Auth later, users.id stays unchanged.
-- Only auth_provider / auth_subject need to change.
-- ============================================================

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    auth_provider TEXT NOT NULL DEFAULT 'supabase',
    auth_subject TEXT NOT NULL,

    email TEXT NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,

    role TEXT NOT NULL DEFAULT 'user'
        CHECK (role IN ('admin', 'user')),

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'disabled')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT users_auth_identity_unique
        UNIQUE (auth_provider, auth_subject)
);


-- Case-insensitive unique emails
CREATE UNIQUE INDEX users_email_lower_unique
ON public.users (lower(email));

CREATE INDEX users_role_idx
ON public.users (role);

CREATE INDEX users_status_idx
ON public.users (status);



-- ============================================================
-- 2. MERCHANT ACCOUNTS
-- ============================================================
--
-- A normal gateway user owns one merchant account.
--
-- Admin users do not need merchant accounts unless they also
-- operate as merchants themselves.
--
-- We intentionally use 1 user -> 1 merchant for now.
-- If Zadhron later introduces business teams, this can evolve
-- into organizations + organization_members.
-- ============================================================

CREATE TABLE public.merchant_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_user_id UUID NOT NULL UNIQUE
        REFERENCES public.users(id)
        ON DELETE RESTRICT,

    business_name TEXT NOT NULL,

    business_email TEXT,
    business_phone TEXT,

    default_currency CHAR(3) NOT NULL DEFAULT 'KES',

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'active',
                'suspended',
                'closed'
            )
        ),

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX merchant_accounts_status_idx
ON public.merchant_accounts (status);



-- ============================================================
-- 3. API KEYS
-- ============================================================
--
-- Merchant API credentials.
--
-- NEVER STORE THE RAW API KEY.
--
-- Example key returned ONCE:
--
--   zd_live_32nf93nd9f...
--
-- Database stores:
--
--   key_prefix = zd_live_32nf
--   key_hash   = SHA-256/full secure hash
--
-- The merchant can therefore identify the key but cannot recover
-- it from the database.
-- ============================================================

CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    merchant_id UUID NOT NULL
        REFERENCES public.merchant_accounts(id)
        ON DELETE RESTRICT,

    name TEXT NOT NULL,

    environment TEXT NOT NULL DEFAULT 'live'
        CHECK (environment IN ('sandbox', 'live')),

    key_prefix TEXT NOT NULL,

    key_hash TEXT NOT NULL UNIQUE,

    last_used_at TIMESTAMPTZ,

    expires_at TIMESTAMPTZ,

    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX api_keys_merchant_idx
ON public.api_keys (merchant_id);

CREATE INDEX api_keys_lookup_idx
ON public.api_keys (key_hash);

CREATE INDEX api_keys_active_idx
ON public.api_keys (merchant_id, environment)
WHERE revoked_at IS NULL;



-- ============================================================
-- 4. WEBHOOKS
-- ============================================================
--
-- Defines where Zadhron sends transaction events to merchants.
--
-- Example:
--
-- https://merchant.com/api/zadhron/webhook
--
-- secret_ciphertext should contain an encrypted signing secret.
-- Do NOT store the secret as plaintext.
-- ============================================================

CREATE TABLE public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    merchant_id UUID NOT NULL
        REFERENCES public.merchant_accounts(id)
        ON DELETE RESTRICT,

    url TEXT NOT NULL,

    environment TEXT NOT NULL DEFAULT 'live'
        CHECK (environment IN ('sandbox', 'live')),

    secret_ciphertext TEXT NOT NULL,

    subscribed_events TEXT[] NOT NULL DEFAULT ARRAY[
        'transaction.succeeded',
        'transaction.failed'
    ],

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX webhooks_merchant_idx
ON public.webhooks (merchant_id);

CREATE INDEX webhooks_active_idx
ON public.webhooks (merchant_id, environment)
WHERE is_active = TRUE;



-- ============================================================
-- 5. TRANSACTIONS
-- ============================================================
--
-- This is the MAIN financial activity table.
--
-- We intentionally do NOT create:
--
-- payment_requests
-- mpesa_transactions
-- b2c_transactions
-- c2b_transactions
--
-- Those would unnecessarily fragment the data.
--
-- One transaction table supports every provider and operation.
-- ============================================================

CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    merchant_id UUID NOT NULL
        REFERENCES public.merchant_accounts(id)
        ON DELETE RESTRICT,

    api_key_id UUID
        REFERENCES public.api_keys(id)
        ON DELETE SET NULL,

    environment TEXT NOT NULL DEFAULT 'live'
        CHECK (environment IN ('sandbox', 'live')),

    -- mpesa today, potentially card/bank/etc later
    provider TEXT NOT NULL,

    -- Examples:
    -- stk_push
    -- c2b
    -- b2c
    -- b2b
    -- reversal
    provider_operation TEXT NOT NULL,

    transaction_type TEXT NOT NULL
        CHECK (
            transaction_type IN (
                'collection',
                'disbursement',
                'refund',
                'reversal'
            )
        ),

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'processing',
                'succeeded',
                'failed',
                'cancelled',
                'reversed'
            )
        ),

    amount NUMERIC(18,2) NOT NULL
        CHECK (amount > 0),

    fee_amount NUMERIC(18,2) NOT NULL DEFAULT 0
        CHECK (fee_amount >= 0),

    currency CHAR(3) NOT NULL DEFAULT 'KES',

    -- Merchant's own reference
    external_reference TEXT,

    -- Protect against duplicate API requests
    idempotency_key TEXT,

    -- Merchant/customer relationship
    customer_reference TEXT,

    customer_msisdn TEXT,

    account_reference TEXT,

    description TEXT,

    -- M-Pesa examples:
    -- CheckoutRequestID
    -- ConversationID
    provider_request_id TEXT,

    -- M-PesaReceiptNumber / TransactionID
    provider_transaction_id TEXT,

    provider_result_code TEXT,

    provider_result_description TEXT,

    -- Provider-specific information we don't want to turn
    -- into permanent schema columns.
    provider_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    processing_started_at TIMESTAMPTZ,

    completed_at TIMESTAMPTZ
);


CREATE INDEX transactions_merchant_created_idx
ON public.transactions (merchant_id, created_at DESC);

CREATE INDEX transactions_status_idx
ON public.transactions (status);

CREATE INDEX transactions_provider_request_idx
ON public.transactions (provider, provider_request_id);

CREATE INDEX transactions_external_reference_idx
ON public.transactions (merchant_id, external_reference);


-- Prevent duplicate merchant API requests
CREATE UNIQUE INDEX transactions_idempotency_unique
ON public.transactions (merchant_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;


-- Provider transaction IDs should normally be unique
CREATE UNIQUE INDEX transactions_provider_transaction_unique
ON public.transactions (provider, provider_transaction_id)
WHERE provider_transaction_id IS NOT NULL;



-- ============================================================
-- 6. PROVIDER EVENTS
-- ============================================================
--
-- Stores RAW inbound events from payment providers.
--
-- THIS is where incoming M-Pesa callbacks initially go.
--
-- Example flow:
--
-- Safaricom
--     ↓
-- /api/webhooks/mpesa
--     ↓
-- provider_events
--     ↓
-- normalize callback
--     ↓
-- transactions
--
-- Keeping the original payload is extremely useful for:
--
-- debugging
-- reconciliation
-- duplicate callback detection
-- auditing
-- handling provider changes
--
-- ============================================================

CREATE TABLE public.provider_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider TEXT NOT NULL,

    event_type TEXT NOT NULL,

    merchant_id UUID
        REFERENCES public.merchant_accounts(id)
        ON DELETE RESTRICT,

    transaction_id UUID
        REFERENCES public.transactions(id)
        ON DELETE SET NULL,

    provider_request_id TEXT,

    payload JSONB NOT NULL,

    payload_hash TEXT,

    source_ip INET,

    processing_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            processing_status IN (
                'pending',
                'processed',
                'ignored',
                'failed'
            )
        ),

    error_message TEXT,

    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    processed_at TIMESTAMPTZ
);


CREATE INDEX provider_events_transaction_idx
ON public.provider_events (transaction_id);

CREATE INDEX provider_events_request_idx
ON public.provider_events (
    provider,
    provider_request_id
);

CREATE INDEX provider_events_received_idx
ON public.provider_events (received_at DESC);

CREATE INDEX provider_events_status_idx
ON public.provider_events (processing_status);



-- ============================================================
-- 7. WEBHOOK DELIVERIES
-- ============================================================
--
-- Tracks webhooks Zadhron sends OUT to merchants.
--
-- provider_events = M-Pesa -> Zadhron
--
-- webhook_deliveries = Zadhron -> Merchant
--
-- Example:
--
-- M-Pesa callback
--      ↓
-- provider_events
--      ↓
-- transaction updated
--      ↓
-- webhook_deliveries
--      ↓
-- merchant callback URL
-- ============================================================

CREATE TABLE public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    webhook_id UUID NOT NULL
        REFERENCES public.webhooks(id)
        ON DELETE RESTRICT,

    transaction_id UUID
        REFERENCES public.transactions(id)
        ON DELETE SET NULL,

    event_type TEXT NOT NULL,

    payload JSONB NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'delivered',
                'failed'
            )
        ),

    attempt_count INTEGER NOT NULL DEFAULT 0
        CHECK (attempt_count >= 0),

    http_status_code INTEGER,

    last_error TEXT,

    next_retry_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    delivered_at TIMESTAMPTZ
);


CREATE INDEX webhook_deliveries_webhook_idx
ON public.webhook_deliveries (webhook_id, created_at DESC);

CREATE INDEX webhook_deliveries_retry_idx
ON public.webhook_deliveries (status, next_retry_at)
WHERE status != 'delivered';



-- ============================================================
-- 8. AUDIT LOGS
-- ============================================================
--
-- Security-sensitive actions should leave an audit trail.
--
-- Examples:
--
-- api_key.created
-- api_key.revoked
-- merchant.suspended
-- webhook.created
-- webhook.updated
-- transaction.reversed
-- user.role_changed
--
-- ============================================================

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    actor_user_id UUID
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    action TEXT NOT NULL,

    entity_type TEXT NOT NULL,

    entity_id UUID,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    ip_address INET,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE INDEX audit_logs_actor_idx
ON public.audit_logs (actor_user_id);

CREATE INDEX audit_logs_created_idx
ON public.audit_logs (created_at DESC);

CREATE INDEX audit_logs_entity_idx
ON public.audit_logs (entity_type, entity_id);



-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER merchant_accounts_set_updated_at
BEFORE UPDATE ON public.merchant_accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


CREATE TRIGGER webhooks_set_updated_at
BEFORE UPDATE ON public.webhooks
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();



-- ============================================================
-- SUPABASE AUTH -> APPLICATION USER
-- ============================================================
--
-- When Supabase creates an authenticated user, create the
-- corresponding application-level user.
--
-- Notice that auth.users.id is NOT our primary key.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN

    INSERT INTO public.users (
        auth_provider,
        auth_subject,
        email,
        full_name
    )
    VALUES (
        'supabase',
        NEW.id::TEXT,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data ->> 'full_name',
            NEW.raw_user_meta_data ->> 'name'
        )
    )
    ON CONFLICT (auth_provider, auth_subject)
    DO UPDATE
    SET
        email = EXCLUDED.email,
        updated_at = now();

    RETURN NEW;

END;
$$;


DROP TRIGGER IF EXISTS on_auth_user_created
ON auth.users;


CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();



-- ============================================================
-- RLS HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id
    FROM public.users
    WHERE auth_provider = 'supabase'
      AND auth_subject = auth.uid()::TEXT
    LIMIT 1;
$$;


CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users
        WHERE auth_provider = 'supabase'
          AND auth_subject = auth.uid()::TEXT
          AND role = 'admin'
          AND status = 'active'
    );
$$;


CREATE OR REPLACE FUNCTION public.current_merchant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT m.id
    FROM public.merchant_accounts m
    JOIN public.users u
      ON u.id = m.owner_user_id
    WHERE u.auth_provider = 'supabase'
      AND u.auth_subject = auth.uid()::TEXT
    LIMIT 1;
$$;


-- ============================================================
-- DASHBOARD RESOLUTION
-- ============================================================
--
-- Centralizes post-login routing decisions in the database.
--
-- Current product rule:
-- - admin users go to the admin dashboard
-- - normal users with a merchant account go to the merchant dashboard
-- - normal users without a merchant account go to onboarding
-- ============================================================

CREATE OR REPLACE FUNCTION public.resolve_dashboard_type()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE
        WHEN public.is_admin() THEN 'admin'
        WHEN public.current_merchant_id() IS NOT NULL THEN 'merchant'
        ELSE 'onboarding'
    END;
$$;


CREATE OR REPLACE FUNCTION public.resolve_dashboard_route()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE public.resolve_dashboard_type()
        WHEN 'admin' THEN '/admin/dashboard'
        WHEN 'merchant' THEN '/app/dashboard'
        ELSE '/signup'
    END;
$$;


-- ============================================================
-- REGISTRATION RPC
-- ============================================================
--
-- Supabase Auth should create the authenticated identity first
-- via supabase.auth.signUp(...).
--
-- This RPC then completes application registration by:
-- - updating the current user's profile
-- - creating or updating the user's single merchant account
-- - returning the post-registration dashboard target
--
-- Current product rule:
-- - public registration creates normal merchant users
-- - admin privileges are NOT self-assigned here
-- ============================================================

CREATE OR REPLACE FUNCTION public.register_new_user(
    p_full_name TEXT,
    p_phone TEXT DEFAULT NULL,
    p_business_name TEXT DEFAULT NULL,
    p_business_email TEXT DEFAULT NULL,
    p_business_phone TEXT DEFAULT NULL,
    p_default_currency TEXT DEFAULT 'KES'
)
RETURNS TABLE (
    user_id UUID,
    merchant_id UUID,
    dashboard_type TEXT,
    dashboard_route TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_merchant_id UUID;
    v_business_name TEXT;
    v_business_email TEXT;
    v_business_phone TEXT;
    v_phone TEXT;
    v_full_name TEXT;
    v_default_currency TEXT;
BEGIN
    v_user_id := public.current_user_id();

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    v_full_name := NULLIF(trim(p_full_name), '');
    v_phone := NULLIF(trim(p_phone), '');
    v_business_name := NULLIF(trim(p_business_name), '');
    v_business_email := NULLIF(trim(p_business_email), '');
    v_business_phone := NULLIF(trim(p_business_phone), '');
    v_default_currency := upper(trim(COALESCE(p_default_currency, 'KES')));

    IF v_default_currency !~ '^[A-Z]{3}$' THEN
        RAISE EXCEPTION 'default_currency must be a 3-letter ISO currency code';
    END IF;

    UPDATE public.users
    SET
        full_name = COALESCE(v_full_name, full_name),
        phone = COALESCE(v_phone, phone),
        updated_at = now()
    WHERE id = v_user_id;

    SELECT id
    INTO v_merchant_id
    FROM public.merchant_accounts
    WHERE owner_user_id = v_user_id
    LIMIT 1;

    IF v_merchant_id IS NULL THEN
        IF v_business_name IS NULL THEN
            RAISE EXCEPTION 'business_name is required';
        END IF;

        INSERT INTO public.merchant_accounts (
            owner_user_id,
            business_name,
            business_email,
            business_phone,
            default_currency,
            status
        )
        VALUES (
            v_user_id,
            v_business_name,
            v_business_email,
            v_business_phone,
            v_default_currency,
            'pending'
        )
        RETURNING id INTO v_merchant_id;
    ELSE
        UPDATE public.merchant_accounts
        SET
            business_name = COALESCE(v_business_name, business_name),
            business_email = COALESCE(v_business_email, business_email),
            business_phone = COALESCE(v_business_phone, business_phone),
            default_currency = COALESCE(v_default_currency, default_currency),
            updated_at = now()
        WHERE id = v_merchant_id;
    END IF;

    RETURN QUERY
    SELECT
        v_user_id,
        v_merchant_id,
        public.resolve_dashboard_type(),
        public.resolve_dashboard_route();
END;
$$;


REVOKE ALL ON FUNCTION public.current_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_merchant_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_dashboard_type() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_dashboard_route() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.register_new_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.current_user_id()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_merchant_id()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_dashboard_type()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_dashboard_route()
TO authenticated;

GRANT EXECUTE ON FUNCTION public.register_new_user(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
TO authenticated;



-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;



-- ============================================================
-- USERS RLS
-- ============================================================

CREATE POLICY users_select_policy
ON public.users
FOR SELECT
TO authenticated
USING (
    id = public.current_user_id()
    OR public.is_admin()
);


CREATE POLICY users_update_policy
ON public.users
FOR UPDATE
TO authenticated
USING (
    id = public.current_user_id()
)
WITH CHECK (
    id = public.current_user_id()
);



-- ============================================================
-- MERCHANT ACCOUNTS RLS
-- ============================================================

CREATE POLICY merchant_select_policy
ON public.merchant_accounts
FOR SELECT
TO authenticated
USING (
    owner_user_id = public.current_user_id()
    OR public.is_admin()
);


CREATE POLICY merchant_insert_policy
ON public.merchant_accounts
FOR INSERT
TO authenticated
WITH CHECK (
    (
        owner_user_id = public.current_user_id()
        AND status = 'pending'
    )
    OR public.is_admin()
);


CREATE POLICY merchant_update_policy
ON public.merchant_accounts
FOR UPDATE
TO authenticated
USING (
    owner_user_id = public.current_user_id()
    OR public.is_admin()
)
WITH CHECK (
    owner_user_id = public.current_user_id()
    OR public.is_admin()
);



-- ============================================================
-- API KEYS RLS
-- ============================================================

CREATE POLICY api_keys_select_policy
ON public.api_keys
FOR SELECT
TO authenticated
USING (
    merchant_id = public.current_merchant_id()
    OR public.is_admin()
);



-- ============================================================
-- WEBHOOKS RLS
-- ============================================================

CREATE POLICY webhooks_select_policy
ON public.webhooks
FOR SELECT
TO authenticated
USING (
    merchant_id = public.current_merchant_id()
    OR public.is_admin()
);



-- ============================================================
-- TRANSACTIONS RLS
-- ============================================================

CREATE POLICY transactions_select_policy
ON public.transactions
FOR SELECT
TO authenticated
USING (
    merchant_id = public.current_merchant_id()
    OR public.is_admin()
);



-- ============================================================
-- PROVIDER EVENTS
-- Raw provider payloads should be admin-only.
-- ============================================================

CREATE POLICY provider_events_admin_policy
ON public.provider_events
FOR SELECT
TO authenticated
USING (
    public.is_admin()
);



-- ============================================================
-- WEBHOOK DELIVERY LOGS
-- ============================================================

CREATE POLICY webhook_deliveries_select_policy
ON public.webhook_deliveries
FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR EXISTS (
        SELECT 1
        FROM public.webhooks w
        WHERE w.id = webhook_deliveries.webhook_id
          AND w.merchant_id = public.current_merchant_id()
    )
);



-- ============================================================
-- AUDIT LOG
-- ============================================================

CREATE POLICY audit_logs_admin_policy
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    public.is_admin()
);



-- ============================================================
-- PERMISSIONS
-- ============================================================

-- Anonymous users get no direct database access.

REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.merchant_accounts FROM anon;
REVOKE ALL ON public.api_keys FROM anon;
REVOKE ALL ON public.webhooks FROM anon;
REVOKE ALL ON public.transactions FROM anon;
REVOKE ALL ON public.provider_events FROM anon;
REVOKE ALL ON public.webhook_deliveries FROM anon;
REVOKE ALL ON public.audit_logs FROM anon;


-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------

REVOKE INSERT, DELETE ON public.users
FROM authenticated;

REVOKE UPDATE ON public.users
FROM authenticated;

GRANT SELECT ON public.users
TO authenticated;

-- Users may update profile information, but NOT:
-- role
-- status
-- auth_provider
-- auth_subject

GRANT UPDATE (
    full_name,
    phone,
    avatar_url
)
ON public.users
TO authenticated;


-- ------------------------------------------------------------
-- MERCHANT ACCOUNT
-- ------------------------------------------------------------

GRANT SELECT, INSERT
ON public.merchant_accounts
TO authenticated;

REVOKE UPDATE ON public.merchant_accounts
FROM authenticated;

GRANT UPDATE (
    business_name,
    business_email,
    business_phone,
    default_currency,
    metadata
)
ON public.merchant_accounts
TO authenticated;


-- ------------------------------------------------------------
-- API KEYS
-- ------------------------------------------------------------
--
-- Do not expose key_hash.
--
-- Creation / revocation should happen through your backend.
-- ------------------------------------------------------------

REVOKE ALL ON public.api_keys
FROM authenticated;

GRANT SELECT (
    id,
    merchant_id,
    name,
    environment,
    key_prefix,
    last_used_at,
    expires_at,
    revoked_at,
    created_at
)
ON public.api_keys
TO authenticated;


-- ------------------------------------------------------------
-- WEBHOOKS
-- ------------------------------------------------------------
--
-- Do not expose secret_ciphertext directly.
-- CRUD should happen through backend endpoints.
-- ------------------------------------------------------------

REVOKE ALL ON public.webhooks
FROM authenticated;

GRANT SELECT (
    id,
    merchant_id,
    url,
    environment,
    subscribed_events,
    is_active,
    created_at,
    updated_at
)
ON public.webhooks
TO authenticated;


-- ------------------------------------------------------------
-- TRANSACTIONS
-- ------------------------------------------------------------

REVOKE ALL ON public.transactions
FROM authenticated;

GRANT SELECT
ON public.transactions
TO authenticated;


-- ------------------------------------------------------------
-- PROVIDER CALLBACKS
-- ------------------------------------------------------------

REVOKE ALL ON public.provider_events
FROM authenticated;

GRANT SELECT
ON public.provider_events
TO authenticated;


-- ------------------------------------------------------------
-- WEBHOOK DELIVERY LOGS
-- ------------------------------------------------------------

REVOKE ALL ON public.webhook_deliveries
FROM authenticated;

GRANT SELECT
ON public.webhook_deliveries
TO authenticated;


-- ------------------------------------------------------------
-- AUDIT LOGS
-- ------------------------------------------------------------

REVOKE ALL ON public.audit_logs
FROM authenticated;

GRANT SELECT
ON public.audit_logs
TO authenticated;
