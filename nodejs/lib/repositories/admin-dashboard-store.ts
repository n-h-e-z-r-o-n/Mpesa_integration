import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface AdminDashboardBalanceAccountSnapshot {
  accountName: string;
  currency: string;
  currentAmount: number;
  availableAmount: number;
  reservedAmount: number;
  unclearedAmount: number;
  snapshotAt: string;
  sourceProviderEventId?: string;
}

export interface AdminDashboardSnapshot {
  dashboardKey: string;
  transactionProcessingCount: number;
  transactionPendingCount: number;
  transactionSucceededCount: number;
  transactionFailedCount: number;
  callbackCount: number;
  requestCount: number;
  failedRequestCount: number;
  slowRequestCount: number;
  activeApplicationCount: number;
  collectionsToday: number;
  payoutsToday: number;
  netFlowToday: number;
  balanceStatus: "available" | "unavailable";
  balanceCurrency?: string;
  balanceTotalCurrent?: number;
  balanceTotalAvailable?: number;
  balanceAccountCount: number;
  latestTransactionAt?: string;
  latestCallbackAt?: string;
  latestRequestAt?: string;
  latestBalanceCallbackAt?: string;
  oldestPendingCreatedAt?: string;
  projectionUpdatedAt: string;
  balanceAccounts: AdminDashboardBalanceAccountSnapshot[];
}

type AdminDashboardStateRow = {
  dashboard_key: string;
  transaction_processing_count: number | string | null;
  transaction_pending_count: number | string | null;
  transaction_succeeded_count: number | string | null;
  transaction_failed_count: number | string | null;
  callback_count: number | string | null;
  request_count: number | string | null;
  failed_request_count: number | string | null;
  slow_request_count: number | string | null;
  active_application_count: number | string | null;
  collections_today: number | string | null;
  payouts_today: number | string | null;
  net_flow_today: number | string | null;
  balance_status: "available" | "unavailable";
  balance_currency: string | null;
  balance_total_current: number | string | null;
  balance_total_available: number | string | null;
  balance_account_count: number | string | null;
  latest_transaction_at: string | null;
  latest_callback_at: string | null;
  latest_request_at: string | null;
  latest_balance_callback_at: string | null;
  oldest_pending_created_at: string | null;
  projection_updated_at: string | null;
};

type AdminDashboardBalanceAccountRow = {
  account_name: string;
  currency: string;
  current_amount: number | string | null;
  available_amount: number | string | null;
  reserved_amount: number | string | null;
  uncleared_amount: number | string | null;
  snapshot_at: string;
  source_provider_event_id: string | null;
};

function readNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function readOptionalString(value: string | null | undefined) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function isOptionalProjectionError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  return (
    message.includes("permission denied for table admin_dashboard_state") ||
    message.includes("permission denied for table admin_dashboard_balance_accounts") ||
    message.includes("relation \"admin_dashboard_state\" does not exist") ||
    message.includes("relation \"admin_dashboard_balance_accounts\" does not exist")
  );
}

function mapBalanceAccount(row: AdminDashboardBalanceAccountRow): AdminDashboardBalanceAccountSnapshot {
  return {
    accountName: row.account_name,
    currency: row.currency,
    currentAmount: readNumber(row.current_amount),
    availableAmount: readNumber(row.available_amount),
    reservedAmount: readNumber(row.reserved_amount),
    unclearedAmount: readNumber(row.uncleared_amount),
    snapshotAt: row.snapshot_at,
    sourceProviderEventId: readOptionalString(row.source_provider_event_id),
  };
}

function mapSnapshot(
  state: AdminDashboardStateRow,
  balanceAccounts: AdminDashboardBalanceAccountRow[],
): AdminDashboardSnapshot {
  return {
    dashboardKey: state.dashboard_key,
    transactionProcessingCount: readNumber(state.transaction_processing_count),
    transactionPendingCount: readNumber(state.transaction_pending_count),
    transactionSucceededCount: readNumber(state.transaction_succeeded_count),
    transactionFailedCount: readNumber(state.transaction_failed_count),
    callbackCount: readNumber(state.callback_count),
    requestCount: readNumber(state.request_count),
    failedRequestCount: readNumber(state.failed_request_count),
    slowRequestCount: readNumber(state.slow_request_count),
    activeApplicationCount: readNumber(state.active_application_count),
    collectionsToday: readNumber(state.collections_today),
    payoutsToday: readNumber(state.payouts_today),
    netFlowToday: readNumber(state.net_flow_today),
    balanceStatus: state.balance_status,
    balanceCurrency: readOptionalString(state.balance_currency),
    balanceTotalCurrent:
      state.balance_total_current === null ? undefined : readNumber(state.balance_total_current),
    balanceTotalAvailable:
      state.balance_total_available === null ? undefined : readNumber(state.balance_total_available),
    balanceAccountCount: readNumber(state.balance_account_count),
    latestTransactionAt: readOptionalString(state.latest_transaction_at),
    latestCallbackAt: readOptionalString(state.latest_callback_at),
    latestRequestAt: readOptionalString(state.latest_request_at),
    latestBalanceCallbackAt: readOptionalString(state.latest_balance_callback_at),
    oldestPendingCreatedAt: readOptionalString(state.oldest_pending_created_at),
    projectionUpdatedAt: readOptionalString(state.projection_updated_at) ?? new Date(0).toISOString(),
    balanceAccounts: balanceAccounts.map(mapBalanceAccount),
  };
}

export async function getAdminDashboardSnapshot(
  dashboardKey = "primary",
): Promise<AdminDashboardSnapshot | null> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data: state, error: stateError } = await supabase
    .from("admin_dashboard_state")
    .select(
      [
        "dashboard_key",
        "transaction_processing_count",
        "transaction_pending_count",
        "transaction_succeeded_count",
        "transaction_failed_count",
        "callback_count",
        "request_count",
        "failed_request_count",
        "slow_request_count",
        "active_application_count",
        "collections_today",
        "payouts_today",
        "net_flow_today",
        "balance_status",
        "balance_currency",
        "balance_total_current",
        "balance_total_available",
        "balance_account_count",
        "latest_transaction_at",
        "latest_callback_at",
        "latest_request_at",
        "latest_balance_callback_at",
        "oldest_pending_created_at",
        "projection_updated_at",
      ].join(", "),
    )
    .eq("dashboard_key", dashboardKey)
    .maybeSingle<AdminDashboardStateRow>();

  if (stateError) {
    if (isOptionalProjectionError(stateError)) {
      return null;
    }

    throw new Error(`Unable to load admin dashboard state: ${stateError.message}`);
  }

  if (!state) {
    return null;
  }

  const { data: balanceAccounts, error: balanceError } = await supabase
    .from("admin_dashboard_balance_accounts")
    .select(
      "account_name, currency, current_amount, available_amount, reserved_amount, uncleared_amount, snapshot_at, source_provider_event_id",
    )
    .eq("dashboard_key", dashboardKey)
    .order("account_name", { ascending: true })
    .returns<AdminDashboardBalanceAccountRow[]>();

  if (balanceError) {
    if (isOptionalProjectionError(balanceError)) {
      return mapSnapshot(state, []);
    }

    throw new Error(`Unable to load admin dashboard balance accounts: ${balanceError.message}`);
  }

  return mapSnapshot(state, balanceAccounts ?? []);
}
