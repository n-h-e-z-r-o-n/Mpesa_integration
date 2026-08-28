import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth/admin-session";
import { getGatewayConfig } from "@/lib/mpesa/config";
import { hasSupabaseAdminAccess } from "@/lib/repositories/callback-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const config = getGatewayConfig();
  return NextResponse.json({
    appName: config.appName,
    environment: config.mpesaEnvironment,
    mpesaBaseUrl: config.mpesaBaseUrl,
    shortcode: config.shortcode,
    tillNumber: config.tillNumber,
    callbackBaseUrl: config.callbackBaseUrl,
    callbackUrls: config.callbackUrls,
    hasInitiatorName: Boolean(config.initiatorName),
    hasInitiatorPassword: Boolean(config.initiatorPassword),
    hasSecurityCredential: Boolean(config.securityCredential),
    hasCertificatePath: Boolean(config.certificatePath),
    callbackAllowedIps: config.callbackAllowedIps,
    callbackPersistence: {
      provider: "supabase",
      enabled: hasSupabaseAdminAccess(),
    },
  });
}
