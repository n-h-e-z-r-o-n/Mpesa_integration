import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { mapTransactionRow, type TransactionRow } from "@/lib/repositories/transaction-records";
import type { TransactionRecord } from "@/types/gateway";

export async function listDatabaseTransactions(limit = 100): Promise<TransactionRecord[] | null> {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("transactions")
    .select(
      [
        "id",
        "provider",
        "provider_operation",
        "status",
        "amount",
        "customer_msisdn",
        "account_reference",
        "external_reference",
        "provider_request_id",
        "provider_transaction_id",
        "idempotency_key",
        "created_at",
        "updated_at",
        "processing_started_at",
        "completed_at",
        "provider_metadata",
      ].join(", "),
    )
    .eq("provider", "mpesa")
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<TransactionRow[]>();

  if (error) {
    throw new Error(`Unable to load database transactions: ${error.message}`);
  }

  return (data ?? []).map(mapTransactionRow);
}
