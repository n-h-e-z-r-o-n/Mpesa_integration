-- ============================================================
-- ZADHRON PAYMENT GATEWAY
-- Admin Dashboard Projection
-- Created: 2026-08-29
-- ============================================================
--
-- Purpose:
-- - move admin dashboard aggregates into durable database state
-- - keep the source of truth in transactions, provider_events,
--   and audit_logs
-- - expose a small projection table that every admin session
--   reads consistently across process restarts
--
-- Notes:
-- - this is a safe first version that fully recomputes the
--   projection on source-table changes
-- - if write volume grows, the trigger strategy can later be
--   optimized into incremental updates
-- ============================================================


-- ============================================================
-- 1. DASHBOARD PROJECTION TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_dashboard_state (
    dashboard_key TEXT PRIMARY KEY DEFAULT 'primary',

    -- Derived transaction counts.
    -- processing is the closest durable equivalent to the old
    -- runtime-only "accepted" state.
    transaction_processing_count INTEGER NOT NULL DEFAULT 0,
    transaction_pending_count INTEGER NOT NULL DEFAULT 0,
    transaction_succeeded_count INTEGER NOT NULL DEFAULT 0,
    transaction_failed_count INTEGER NOT NULL DEFAULT 0,

    -- Derived event and request counts.
    callback_count BIGINT NOT NULL DEFAULT 0,
    request_count BIGINT NOT NULL DEFAULT 0,
    failed_request_count BIGINT NOT NULL DEFAULT 0,
    slow_request_count BIGINT NOT NULL DEFAULT 0,
    active_application_count INTEGER NOT NULL DEFAULT 0,

    -- Current-day treasury rollups, aligned to Africa/Nairobi.
    collections_today NUMERIC(18,2) NOT NULL DEFAULT 0,
    payouts_today NUMERIC(18,2) NOT NULL DEFAULT 0,
    net_flow_today NUMERIC(18,2) NOT NULL DEFAULT 0,

    -- Latest shortcode balance snapshot, seeded from the most
    -- recent successful accountBalanceResult callback and then
    -- adjusted by later transaction state changes.
    balance_status TEXT NOT NULL DEFAULT 'unavailable'
        CHECK (balance_status IN ('available', 'unavailable')),
    balance_currency CHAR(3),
    balance_total_current NUMERIC(18,2),
    balance_total_available NUMERIC(18,2),
    balance_account_count INTEGER NOT NULL DEFAULT 0,

    -- Activity markers for freshness and pending-age calculations.
    latest_transaction_at TIMESTAMPTZ,
    latest_callback_at TIMESTAMPTZ,
    latest_request_at TIMESTAMPTZ,
    latest_balance_callback_at TIMESTAMPTZ,
    oldest_pending_created_at TIMESTAMPTZ,

    projection_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS public.admin_dashboard_balance_accounts (
    dashboard_key TEXT NOT NULL
        REFERENCES public.admin_dashboard_state(dashboard_key)
        ON DELETE CASCADE,

    account_name TEXT NOT NULL,
    currency CHAR(3) NOT NULL,

    current_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    available_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    reserved_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
    uncleared_amount NUMERIC(18,2) NOT NULL DEFAULT 0,

    source_provider_event_id UUID
        REFERENCES public.provider_events(id)
        ON DELETE SET NULL,

    snapshot_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (dashboard_key, account_name)
);


CREATE INDEX IF NOT EXISTS admin_dashboard_balance_accounts_snapshot_idx
ON public.admin_dashboard_balance_accounts (dashboard_key, snapshot_at DESC);


DROP TRIGGER IF EXISTS admin_dashboard_state_set_updated_at
ON public.admin_dashboard_state;

CREATE TRIGGER admin_dashboard_state_set_updated_at
BEFORE UPDATE ON public.admin_dashboard_state
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS admin_dashboard_balance_accounts_set_updated_at
ON public.admin_dashboard_balance_accounts;

CREATE TRIGGER admin_dashboard_balance_accounts_set_updated_at
BEFORE UPDATE ON public.admin_dashboard_balance_accounts
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 2. HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.admin_dashboard_business_day(
    p_timestamp TIMESTAMPTZ DEFAULT now()
)
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
    SELECT (p_timestamp AT TIME ZONE 'Africa/Nairobi')::DATE;
$$;


CREATE OR REPLACE FUNCTION public.ensure_admin_dashboard_state_row(
    p_dashboard_key TEXT DEFAULT 'primary'
)
RETURNS public.admin_dashboard_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_state public.admin_dashboard_state%ROWTYPE;
BEGIN
    INSERT INTO public.admin_dashboard_state (dashboard_key)
    VALUES (p_dashboard_key)
    ON CONFLICT (dashboard_key) DO NOTHING;

    SELECT *
    INTO v_state
    FROM public.admin_dashboard_state
    WHERE dashboard_key = p_dashboard_key;

    RETURN v_state;
END;
$$;


-- ============================================================
-- 3. INTERNAL PROJECTION REFRESH
-- ============================================================

CREATE OR REPLACE FUNCTION public.refresh_admin_dashboard_state(
    p_dashboard_key TEXT DEFAULT 'primary'
)
RETURNS public.admin_dashboard_state
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today DATE := public.admin_dashboard_business_day(now());

    v_transaction_processing_count INTEGER := 0;
    v_transaction_pending_count INTEGER := 0;
    v_transaction_succeeded_count INTEGER := 0;
    v_transaction_failed_count INTEGER := 0;

    v_callback_count BIGINT := 0;
    v_request_count BIGINT := 0;
    v_failed_request_count BIGINT := 0;
    v_slow_request_count BIGINT := 0;
    v_active_application_count INTEGER := 0;

    v_collections_today NUMERIC(18,2) := 0;
    v_payouts_today NUMERIC(18,2) := 0;

    v_latest_transaction_at TIMESTAMPTZ;
    v_latest_callback_at TIMESTAMPTZ;
    v_latest_request_at TIMESTAMPTZ;
    v_latest_balance_callback_at TIMESTAMPTZ;
    v_oldest_pending_created_at TIMESTAMPTZ;

    v_balance_event_id UUID;
    v_balance_text TEXT;
    v_balance_snapshot_at TIMESTAMPTZ;
    v_balance_seed_account_count INTEGER := 0;
    v_balance_display_currency CHAR(3) := 'KES';
    v_balance_delta_current NUMERIC(18,2) := 0;
    v_balance_delta_available NUMERIC(18,2) := 0;
    v_balance_delta_reserved NUMERIC(18,2) := 0;
    v_balance_delta_uncleared NUMERIC(18,2) := 0;
    v_balance_account_count INTEGER := 0;
    v_balance_currency CHAR(3);
    v_balance_total_current NUMERIC(18,2);
    v_balance_total_available NUMERIC(18,2);

    v_state public.admin_dashboard_state%ROWTYPE;
BEGIN
    PERFORM public.ensure_admin_dashboard_state_row(p_dashboard_key);

    SELECT
        COUNT(*) FILTER (WHERE status = 'processing'),
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing')),
        COUNT(*) FILTER (WHERE status = 'succeeded'),
        COUNT(*) FILTER (WHERE status = 'failed'),
        COALESCE(
            SUM(
                CASE
                    WHEN transaction_type = 'collection'
                     AND status = 'succeeded'
                     AND public.admin_dashboard_business_day(COALESCE(completed_at, created_at)) = v_today
                    THEN amount
                    ELSE 0
                END
            ),
            0
        ),
        COALESCE(
            SUM(
                CASE
                    WHEN transaction_type = 'disbursement'
                     AND status = 'succeeded'
                     AND public.admin_dashboard_business_day(COALESCE(completed_at, created_at)) = v_today
                    THEN amount
                    ELSE 0
                END
            ),
            0
        ),
        MAX(COALESCE(completed_at, processing_started_at, created_at)),
        MIN(created_at) FILTER (WHERE status IN ('pending', 'processing'))
    INTO
        v_transaction_processing_count,
        v_transaction_pending_count,
        v_transaction_succeeded_count,
        v_transaction_failed_count,
        v_collections_today,
        v_payouts_today,
        v_latest_transaction_at,
        v_oldest_pending_created_at
    FROM public.transactions
    WHERE provider = 'mpesa';

    SELECT
        COUNT(*),
        MAX(received_at)
    INTO
        v_callback_count,
        v_latest_callback_at
    FROM public.provider_events
    WHERE provider = 'mpesa';

    SELECT
        COUNT(*),
        COUNT(*) FILTER (
            WHERE (metadata ->> 'status') ~ '^[0-9]+$'
              AND (metadata ->> 'status')::INTEGER >= 400
        ),
        COUNT(*) FILTER (
            WHERE (metadata ->> 'latencyMs') ~ '^[0-9]+(\.[0-9]+)?$'
              AND (metadata ->> 'latencyMs')::NUMERIC >= 1000
        ),
        COUNT(DISTINCT NULLIF(metadata ->> 'applicationId', '')),
        MAX(created_at)
    INTO
        v_request_count,
        v_failed_request_count,
        v_slow_request_count,
        v_active_application_count,
        v_latest_request_at
    FROM public.audit_logs
    WHERE action = 'gateway_request_log';

    SELECT
        pe.id,
        pe.received_at,
        (
            SELECT parameter ->> 'Value'
            FROM jsonb_array_elements(
                CASE jsonb_typeof(pe.payload -> 'Result' -> 'ResultParameters' -> 'ResultParameter')
                    WHEN 'array' THEN pe.payload -> 'Result' -> 'ResultParameters' -> 'ResultParameter'
                    WHEN 'object' THEN jsonb_build_array(pe.payload -> 'Result' -> 'ResultParameters' -> 'ResultParameter')
                    ELSE '[]'::JSONB
                END
            ) AS parameter
            WHERE parameter ->> 'Key' = 'AccountBalance'
            LIMIT 1
        )
    INTO
        v_balance_event_id,
        v_latest_balance_callback_at,
        v_balance_text
    FROM public.provider_events pe
    WHERE pe.provider = 'mpesa'
      AND pe.event_type = 'accountBalanceResult'
      AND COALESCE(pe.payload -> 'Result' ->> 'ResultCode', '') = '0'
    ORDER BY pe.received_at DESC
    LIMIT 1;

    v_balance_snapshot_at := v_latest_balance_callback_at;

    DELETE FROM public.admin_dashboard_balance_accounts
    WHERE dashboard_key = p_dashboard_key;

    IF v_balance_text IS NOT NULL AND btrim(v_balance_text) <> '' THEN
        INSERT INTO public.admin_dashboard_balance_accounts (
            dashboard_key,
            account_name,
            currency,
            current_amount,
            available_amount,
            reserved_amount,
            uncleared_amount,
            source_provider_event_id,
            snapshot_at
        )
        SELECT
            p_dashboard_key,
            btrim(split_part(segment, '|', 1)),
            upper(btrim(split_part(segment, '|', 2)))::CHAR(3),
            NULLIF(btrim(split_part(segment, '|', 3)), '')::NUMERIC(18,2),
            NULLIF(btrim(split_part(segment, '|', 4)), '')::NUMERIC(18,2),
            NULLIF(btrim(split_part(segment, '|', 5)), '')::NUMERIC(18,2),
            NULLIF(btrim(split_part(segment, '|', 6)), '')::NUMERIC(18,2),
            v_balance_event_id,
            v_latest_balance_callback_at
        FROM regexp_split_to_table(v_balance_text, '&') AS segment
        WHERE btrim(segment) <> ''
          AND btrim(split_part(segment, '|', 1)) <> ''
          AND btrim(split_part(segment, '|', 2)) <> '';
    END IF;

    SELECT
        COUNT(*),
        COALESCE(MIN(currency), 'KES'::CHAR(3))
    INTO
        v_balance_seed_account_count,
        v_balance_display_currency
    FROM public.admin_dashboard_balance_accounts
    WHERE dashboard_key = p_dashboard_key;

    SELECT
        COALESCE(
            SUM(
                CASE
                    WHEN transaction_type = 'collection'
                     AND status = 'succeeded'
                    THEN amount
                    WHEN transaction_type = 'disbursement'
                     AND status = 'succeeded'
                    THEN -amount
                    WHEN transaction_type = 'reversal'
                     AND status = 'succeeded'
                    THEN amount
                    ELSE 0
                END
            ),
            0
        ),
        COALESCE(
            SUM(
                CASE
                    WHEN transaction_type = 'collection'
                     AND status = 'succeeded'
                    THEN amount
                    WHEN transaction_type = 'disbursement'
                     AND status = 'succeeded'
                    THEN -amount
                    WHEN transaction_type = 'reversal'
                     AND status = 'succeeded'
                    THEN amount
                    ELSE 0
                END
            ),
            0
        ),
        COALESCE(
            SUM(
                CASE
                    WHEN transaction_type = 'disbursement'
                     AND status IN ('pending', 'processing')
                    THEN amount
                    ELSE 0
                END
            ),
            0
        ),
        COALESCE(
            SUM(
                CASE
                    WHEN transaction_type = 'collection'
                     AND status IN ('pending', 'processing')
                    THEN amount
                    ELSE 0
                END
            ),
            0
        )
    INTO
        v_balance_delta_current,
        v_balance_delta_available,
        v_balance_delta_reserved,
        v_balance_delta_uncleared
    FROM public.transactions
    WHERE provider = 'mpesa'
      AND COALESCE(completed_at, processing_started_at, updated_at, created_at)
          > COALESCE(v_balance_snapshot_at, '-infinity'::TIMESTAMPTZ);

    IF v_balance_seed_account_count = 0 THEN
        IF (
            v_balance_delta_current <> 0
            OR v_balance_delta_available <> 0
            OR v_balance_delta_reserved <> 0
            OR v_balance_delta_uncleared <> 0
        ) THEN
            INSERT INTO public.admin_dashboard_balance_accounts (
                dashboard_key,
                account_name,
                currency,
                current_amount,
                available_amount,
                reserved_amount,
                uncleared_amount,
                source_provider_event_id,
                snapshot_at
            )
            VALUES (
                p_dashboard_key,
                'M-Pesa Float',
                v_balance_display_currency,
                v_balance_delta_current,
                v_balance_delta_available,
                v_balance_delta_reserved,
                v_balance_delta_uncleared,
                v_balance_event_id,
                COALESCE(v_latest_transaction_at, now())
            );
        END IF;
    ELSIF v_balance_seed_account_count = 1 THEN
        UPDATE public.admin_dashboard_balance_accounts
        SET
            current_amount = current_amount + v_balance_delta_current,
            available_amount = available_amount + v_balance_delta_available,
            reserved_amount = v_balance_delta_reserved,
            uncleared_amount = v_balance_delta_uncleared,
            snapshot_at = GREATEST(snapshot_at, COALESCE(v_latest_transaction_at, snapshot_at))
        WHERE dashboard_key = p_dashboard_key;
    ELSIF (
        v_balance_delta_current <> 0
        OR v_balance_delta_available <> 0
        OR v_balance_delta_reserved <> 0
        OR v_balance_delta_uncleared <> 0
    ) THEN
        INSERT INTO public.admin_dashboard_balance_accounts (
            dashboard_key,
            account_name,
            currency,
            current_amount,
            available_amount,
            reserved_amount,
            uncleared_amount,
            source_provider_event_id,
            snapshot_at
        )
        VALUES (
            p_dashboard_key,
            'Transaction Delta',
            v_balance_display_currency,
            v_balance_delta_current,
            v_balance_delta_available,
            v_balance_delta_reserved,
            v_balance_delta_uncleared,
            v_balance_event_id,
            COALESCE(v_latest_transaction_at, now())
        )
        ON CONFLICT (dashboard_key, account_name) DO UPDATE
        SET
            currency = EXCLUDED.currency,
            current_amount = EXCLUDED.current_amount,
            available_amount = EXCLUDED.available_amount,
            reserved_amount = EXCLUDED.reserved_amount,
            uncleared_amount = EXCLUDED.uncleared_amount,
            source_provider_event_id = EXCLUDED.source_provider_event_id,
            snapshot_at = EXCLUDED.snapshot_at;
    END IF;

    SELECT
        COUNT(*),
        CASE
            WHEN COUNT(DISTINCT currency) = 1 THEN MIN(currency)
            ELSE NULL
        END,
        COALESCE(SUM(current_amount), 0),
        COALESCE(SUM(available_amount), 0)
    INTO
        v_balance_account_count,
        v_balance_currency,
        v_balance_total_current,
        v_balance_total_available
    FROM public.admin_dashboard_balance_accounts
    WHERE dashboard_key = p_dashboard_key;

    UPDATE public.admin_dashboard_state
    SET
        transaction_processing_count = v_transaction_processing_count,
        transaction_pending_count = v_transaction_pending_count,
        transaction_succeeded_count = v_transaction_succeeded_count,
        transaction_failed_count = v_transaction_failed_count,
        callback_count = v_callback_count,
        request_count = v_request_count,
        failed_request_count = v_failed_request_count,
        slow_request_count = v_slow_request_count,
        active_application_count = v_active_application_count,
        collections_today = COALESCE(v_collections_today, 0),
        payouts_today = COALESCE(v_payouts_today, 0),
        net_flow_today = COALESCE(v_collections_today, 0) - COALESCE(v_payouts_today, 0),
        balance_status = CASE
            WHEN v_balance_account_count > 0 THEN 'available'
            ELSE 'unavailable'
        END,
        balance_currency = CASE
            WHEN v_balance_account_count > 0 THEN v_balance_currency
            ELSE NULL
        END,
        balance_total_current = CASE
            WHEN v_balance_account_count > 0 THEN v_balance_total_current
            ELSE NULL
        END,
        balance_total_available = CASE
            WHEN v_balance_account_count > 0 THEN v_balance_total_available
            ELSE NULL
        END,
        balance_account_count = v_balance_account_count,
        latest_transaction_at = v_latest_transaction_at,
        latest_callback_at = v_latest_callback_at,
        latest_request_at = v_latest_request_at,
        latest_balance_callback_at = v_latest_balance_callback_at,
        oldest_pending_created_at = v_oldest_pending_created_at,
        projection_updated_at = now()
    WHERE dashboard_key = p_dashboard_key;

    SELECT *
    INTO v_state
    FROM public.admin_dashboard_state
    WHERE dashboard_key = p_dashboard_key;

    RETURN v_state;
END;
$$;


-- ============================================================
-- 4. ADMIN RPC FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_snapshot(
    p_dashboard_key TEXT DEFAULT 'primary'
)
RETURNS TABLE (
    dashboard_key TEXT,
    transaction_processing_count INTEGER,
    transaction_pending_count INTEGER,
    transaction_succeeded_count INTEGER,
    transaction_failed_count INTEGER,
    callback_count BIGINT,
    request_count BIGINT,
    failed_request_count BIGINT,
    slow_request_count BIGINT,
    active_application_count INTEGER,
    collections_today NUMERIC(18,2),
    payouts_today NUMERIC(18,2),
    net_flow_today NUMERIC(18,2),
    balance_status TEXT,
    balance_currency CHAR(3),
    balance_total_current NUMERIC(18,2),
    balance_total_available NUMERIC(18,2),
    balance_account_count INTEGER,
    latest_transaction_at TIMESTAMPTZ,
    latest_callback_at TIMESTAMPTZ,
    latest_request_at TIMESTAMPTZ,
    latest_balance_callback_at TIMESTAMPTZ,
    oldest_pending_created_at TIMESTAMPTZ,
    projection_updated_at TIMESTAMPTZ,
    balance_accounts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    RETURN QUERY
    SELECT
        s.dashboard_key,
        s.transaction_processing_count,
        s.transaction_pending_count,
        s.transaction_succeeded_count,
        s.transaction_failed_count,
        s.callback_count,
        s.request_count,
        s.failed_request_count,
        s.slow_request_count,
        s.active_application_count,
        s.collections_today,
        s.payouts_today,
        s.net_flow_today,
        s.balance_status,
        s.balance_currency,
        s.balance_total_current,
        s.balance_total_available,
        s.balance_account_count,
        s.latest_transaction_at,
        s.latest_callback_at,
        s.latest_request_at,
        s.latest_balance_callback_at,
        s.oldest_pending_created_at,
        s.projection_updated_at,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'accountName', ba.account_name,
                    'currency', ba.currency,
                    'currentAmount', ba.current_amount,
                    'availableAmount', ba.available_amount,
                    'reservedAmount', ba.reserved_amount,
                    'unclearedAmount', ba.uncleared_amount,
                    'snapshotAt', ba.snapshot_at,
                    'sourceProviderEventId', ba.source_provider_event_id
                )
                ORDER BY ba.account_name
            ) FILTER (WHERE ba.account_name IS NOT NULL),
            '[]'::JSONB
        ) AS balance_accounts
    FROM public.admin_dashboard_state s
    LEFT JOIN public.admin_dashboard_balance_accounts ba
      ON ba.dashboard_key = s.dashboard_key
    WHERE s.dashboard_key = p_dashboard_key
    GROUP BY
        s.dashboard_key,
        s.transaction_processing_count,
        s.transaction_pending_count,
        s.transaction_succeeded_count,
        s.transaction_failed_count,
        s.callback_count,
        s.request_count,
        s.failed_request_count,
        s.slow_request_count,
        s.active_application_count,
        s.collections_today,
        s.payouts_today,
        s.net_flow_today,
        s.balance_status,
        s.balance_currency,
        s.balance_total_current,
        s.balance_total_available,
        s.balance_account_count,
        s.latest_transaction_at,
        s.latest_callback_at,
        s.latest_request_at,
        s.latest_balance_callback_at,
        s.oldest_pending_created_at,
        s.projection_updated_at;
END;
$$;


CREATE OR REPLACE FUNCTION public.rebuild_admin_dashboard_state(
    p_dashboard_key TEXT DEFAULT 'primary'
)
RETURNS TABLE (
    dashboard_key TEXT,
    transaction_processing_count INTEGER,
    transaction_pending_count INTEGER,
    transaction_succeeded_count INTEGER,
    transaction_failed_count INTEGER,
    callback_count BIGINT,
    request_count BIGINT,
    failed_request_count BIGINT,
    slow_request_count BIGINT,
    active_application_count INTEGER,
    collections_today NUMERIC(18,2),
    payouts_today NUMERIC(18,2),
    net_flow_today NUMERIC(18,2),
    balance_status TEXT,
    balance_currency CHAR(3),
    balance_total_current NUMERIC(18,2),
    balance_total_available NUMERIC(18,2),
    balance_account_count INTEGER,
    latest_transaction_at TIMESTAMPTZ,
    latest_callback_at TIMESTAMPTZ,
    latest_request_at TIMESTAMPTZ,
    latest_balance_callback_at TIMESTAMPTZ,
    oldest_pending_created_at TIMESTAMPTZ,
    projection_updated_at TIMESTAMPTZ,
    balance_accounts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Admin access required';
    END IF;

    PERFORM public.refresh_admin_dashboard_state(p_dashboard_key);

    RETURN QUERY
    SELECT *
    FROM public.get_admin_dashboard_snapshot(p_dashboard_key);
END;
$$;


-- ============================================================
-- 5. SOURCE TABLE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_admin_dashboard_source_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.refresh_admin_dashboard_state('primary');
    RETURN NULL;
END;
$$;


DROP TRIGGER IF EXISTS transactions_refresh_admin_dashboard
ON public.transactions;

CREATE TRIGGER transactions_refresh_admin_dashboard
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH STATEMENT
EXECUTE FUNCTION public.handle_admin_dashboard_source_change();


DROP TRIGGER IF EXISTS provider_events_refresh_admin_dashboard
ON public.provider_events;

CREATE TRIGGER provider_events_refresh_admin_dashboard
AFTER INSERT OR UPDATE OR DELETE ON public.provider_events
FOR EACH STATEMENT
EXECUTE FUNCTION public.handle_admin_dashboard_source_change();


DROP TRIGGER IF EXISTS audit_logs_refresh_admin_dashboard
ON public.audit_logs;

CREATE TRIGGER audit_logs_refresh_admin_dashboard
AFTER INSERT OR UPDATE OR DELETE ON public.audit_logs
FOR EACH STATEMENT
EXECUTE FUNCTION public.handle_admin_dashboard_source_change();


-- ============================================================
-- 6. SECURITY
-- ============================================================

ALTER TABLE public.admin_dashboard_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_dashboard_balance_accounts ENABLE ROW LEVEL SECURITY;


DROP POLICY IF EXISTS admin_dashboard_state_admin_policy
ON public.admin_dashboard_state;

CREATE POLICY admin_dashboard_state_admin_policy
ON public.admin_dashboard_state
FOR SELECT
TO authenticated
USING (
    public.is_admin()
);


DROP POLICY IF EXISTS admin_dashboard_balance_accounts_admin_policy
ON public.admin_dashboard_balance_accounts;

CREATE POLICY admin_dashboard_balance_accounts_admin_policy
ON public.admin_dashboard_balance_accounts
FOR SELECT
TO authenticated
USING (
    public.is_admin()
);


REVOKE ALL ON public.admin_dashboard_state
FROM authenticated;

REVOKE ALL ON public.admin_dashboard_balance_accounts
FROM authenticated;

GRANT SELECT ON public.admin_dashboard_state
TO authenticated;

GRANT SELECT ON public.admin_dashboard_balance_accounts
TO authenticated;


REVOKE ALL ON FUNCTION public.admin_dashboard_business_day(TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_admin_dashboard_state_row(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_admin_dashboard_state(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_snapshot(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rebuild_admin_dashboard_state(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_admin_dashboard_source_change() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_snapshot(TEXT)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.rebuild_admin_dashboard_state(TEXT)
TO authenticated;


-- ============================================================
-- 7. INITIAL BACKFILL
-- ============================================================

INSERT INTO public.admin_dashboard_state (dashboard_key)
VALUES ('primary')
ON CONFLICT (dashboard_key) DO NOTHING;

SELECT public.refresh_admin_dashboard_state('primary');
