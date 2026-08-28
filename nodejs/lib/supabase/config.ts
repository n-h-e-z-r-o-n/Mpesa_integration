type SupabaseConfig = {
  publishableKey: string;
  url: string;
};

function readEnv(primary: string, fallback: string) {
  return process.env[primary] ?? process.env[fallback] ?? "";
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = readEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = readEnv("SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (!url || !publishableKey) {
    throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured.");
  }

  return { url, publishableKey };
}
