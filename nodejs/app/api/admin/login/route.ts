import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

import { adminCookie, authenticateAdmin } from "@/lib/auth/admin-session";
import { logEvent } from "@/lib/logger";
import { GatewayAuthenticationError } from "@/lib/mpesa/errors";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const token = authenticateAdmin(body.email ?? "", body.password ?? "");
    const response = NextResponse.json({ success: true });
    response.cookies.set(adminCookie.name, token, adminCookie.options);
    logEvent("info", "Administrator logged in", { email: body.email?.toLowerCase() });
    return response;
  } catch (error) {
    if (error instanceof GatewayAuthenticationError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.status },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "gateway_configuration_error",
            message: "Administrator authentication is not configured correctly.",
            details: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
        },
        { status: 503 },
      );
    }

    logEvent("error", "Administrator login failed unexpectedly", {
      message: error instanceof Error ? error.message : "unknown error",
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "internal_error",
          message: "Administrator login failed unexpectedly.",
        },
      },
      { status: 500 },
    );
  }
}
