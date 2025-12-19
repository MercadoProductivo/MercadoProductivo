import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit-kv";
import { getClientIP } from "@/lib/security/security-logger";


export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    // Rate limiting: máximo 10 verificaciones por minuto por IP (prevenir enumeración)
    const clientIP = getClientIP(req) || "unknown";
    const rateLimitResult = await checkRateLimit({
      identifier: clientIP,
      namespace: "api:auth:check-email",
      maxRequests: 10,
      windowSeconds: 60,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "RATE_LIMIT_EXCEEDED",
          message: "Demasiadas solicitudes. Por favor intenta más tarde.",
        },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const json = await req.json();
    const { email } = bodySchema.parse(json);
    const emailNormalized = email.trim();

    // URL del proyecto y Service Role
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (!url || !serviceKey) {
      logger.error("Missing Supabase environment variables for check-email");
      return new NextResponse("Configuración inválida", { status: 500, headers: { "Cache-Control": "no-store" } });
    }
    const baseUrl = url.replace(/\/$/, '');
    const emailLower = emailNormalized.toLowerCase();
    // Usamos GoTrue Admin API porque el schema 'auth' no está expuesto por PostgREST
    const res = await fetch(`${baseUrl}/auth/v1/admin/users?email=${encodeURIComponent(emailLower)}`, {
      method: 'GET',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Cache-Control': 'no-store',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      logger.error('GoTrue admin users API failed', { status: res.status });
      return NextResponse.json(
        { error: 'GOTRUE_ERROR', details: { status: res.status } },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    const payload = await res.json();
    const list = Array.isArray((payload as any)?.users)
      ? (payload as any).users
      : Array.isArray(payload)
        ? payload
        : (payload as any)?.user
          ? [(payload as any).user]
          : [];
    const exists = list.some((u: any) => String(u?.email || '').toLowerCase().trim() === emailLower);
    return NextResponse.json(
      { exists, _debug: { source: 'gotrue', email: emailNormalized } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }
    logger.error("Unexpected error in check-email", { error: String(err) });
    return NextResponse.json(
      {
        error: 'UNEXPECTED_ERROR',
        details: { message: String(err) },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
