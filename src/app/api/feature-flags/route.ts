import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * Endpoint de debug para verificar estado de feature flags
 * Solo debe usarse en desarrollo/staging
 */
export async function GET() {
  try {
    // Bloquear completamente en producción por seguridad
    // Sin excepción de ALLOW_FLAG_DEBUG para prevenir exposición
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const flags = {
      // Backend flags
      backend: {
        chatV2Enabled: process.env.FEATURE_CHAT_V2_ENABLED === "true",
        mpWebhookAllowTests: process.env.MP_WEBHOOK_ALLOW_TESTS === "true",
        billingBypassPendingCheck: process.env.BILLING_BYPASS_PENDING_CHECK === "true",
      },
      // Frontend flags (también disponibles en cliente)
      frontend: {
        chatV2Enabled: process.env.NEXT_PUBLIC_FEATURE_CHAT_V2_ENABLED === "true",
      },
      // Información del entorno
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "not-set",
      },
      // Servicios configurados (información genérica)
      services: {
        authConfigured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        realtimeConfigured: !!(process.env.PUSHER_APP_ID),
        paymentConfigured: !!process.env.MP_ACCESS_TOKEN,
        captchaConfigured: !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
      },
    };

    return NextResponse.json(flags);
  } catch (e: any) {
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: e?.message || String(e) },
      { status: 500 }
    );
  }
}
