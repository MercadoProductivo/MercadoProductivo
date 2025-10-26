import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getNormalizedRoleFromUser } from "@/lib/auth/role";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/rate-limit-kv";

export async function POST(req: Request) {
  try {
    const supabase = createRouteClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    // Solo vendedores pueden destacar servicios
    const role = getNormalizedRoleFromUser(user);
    if (role !== "seller") {
      return NextResponse.json({ error: "Prohibido: esta acción es solo para vendedores" }, { status: 403 });
    }

    // Rate limiting: máximo 10 servicios destacados por hora
    const rateLimitResult = await checkRateLimit({
      identifier: user.id,
      namespace: "api:services:feature",
      maxRequests: 10,
      windowSeconds: 3600,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "RATE_LIMIT_EXCEEDED",
          message: "Has excedido el límite de servicios destacados. Intenta más tarde.",
          resetAt: new Date(rateLimitResult.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": String(rateLimitResult.remaining),
            "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          },
        }
      );
    }

    const body = await req.json().catch(() => ({}));
    const serviceId = String(body?.serviceId || "").trim();
    const days = Number(body?.days ?? 0);
    const cost = Number.isFinite(Number(body?.cost)) ? Number(body.cost) : null;

    if (!serviceId) return NextResponse.json({ error: "serviceId requerido" }, { status: 400 });
    if (!Number.isFinite(days) || days <= 0) return NextResponse.json({ error: "days inválido" }, { status: 400 });

    // Verificar propiedad del servicio
    const { data: ownerRow, error: ownerErr } = await supabase
      .from("services")
      .select("user_id")
      .eq("id", serviceId)
      .single();
    if (ownerErr || !ownerRow) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }
    if (ownerRow.user_id !== user.id) {
      return NextResponse.json({ error: "Prohibido: no puedes modificar servicios de otro usuario" }, { status: 403 });
    }
    
    // Validar permiso del plan para destacar (fallback permisivo si no se puede determinar)
    let canFeature: boolean | null = null;
    try {
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("plan_code")
        .eq("id", user.id)
        .maybeSingle();
      if (!profErr) {
        const planCode = (profile?.plan_code || "").toString();
        if (planCode) {
          const { data: plan, error: planErr } = await supabase
            .from("plans")
            .select("can_feature")
            .eq("code", planCode)
            .maybeSingle();
          if (!planErr) {
            const val = (plan as any)?.can_feature;
            canFeature = typeof val === "boolean" ? val : true; // si no existe, permitir
          }
        }
      }
    } catch {
      canFeature = null;
    }
    if (canFeature === false) {
      return NextResponse.json({ error: "Tu plan actual no permite destacar servicios" }, { status: 403 });
    }

    const { data, error } = await supabase.rpc("sp_feature_service", {
      p_service: serviceId,
      p_days: days,
      // si no hay costo definido en el plan, el RPC acepta un fallback
      p_cost: cost,
    });
    if (error) {
      logger.error("sp_feature_service failed", {
        error: error.message,
        code: (error as any)?.code,
        user_id: user.id,
      });
      return NextResponse.json(
        {
          error: error.message,
          // @ts-ignore
          code: error?.code ?? null,
          // @ts-ignore
          details: error?.details ?? null,
          // @ts-ignore
          hint: error?.hint ?? null,
        },
        { status: 400 }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      remainingCredits: row?.remaining_credits ?? null,
      featuredUntil: row?.featured_until ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error inesperado" }, { status: 500 });
  }
}
