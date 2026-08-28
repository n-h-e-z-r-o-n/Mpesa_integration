import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;
let browserClientKey = "";

export function getSupabaseBrowserClient(url?: string, publishableKey?: string) {
  const config = url && publishableKey ? { publishableKey, url } : getSupabaseConfig();
  const resolvedUrl = url ?? config.url;
  const resolvedPublishableKey = publishableKey ?? config.publishableKey;
  const cacheKey = `${resolvedUrl}::${resolvedPublishableKey}`;

  if (!browserClient || browserClientKey !== cacheKey) {
    browserClient = createBrowserClient(resolvedUrl, resolvedPublishableKey);
    browserClientKey = cacheKey;
  }

  return browserClient;
}
