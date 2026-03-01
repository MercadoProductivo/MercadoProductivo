import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/cron/apply-pending-plans
 * 
 * Aplica cambios de plan pendientes cuando su fecha efectiva ya pasó.
 * Ejemplo: usuarios que cancelaron "al fin de ciclo" y cuya suscripción venció.
 * 
 * Protegido por CRON_SECRET (Vercel lo envía en Authorization header).
 * Programado vía vercel.json para correr diariamente a la 1am UTC.
 */
export async function GET(req: Request) {
    // Verificar que la request viene de Vercel Cron (o de un servicio autorizado)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    try {
        // Llamar a la función SQL que aplica los cambios pendientes
        const { data, error } = await (admin.rpc as any)("apply_pending_plan_changes");

        if (error) {
            console.error("[Cron] apply_pending_plan_changes failed:", error);

            // Registrar el error en billing_events para trazabilidad
            try {
                await admin.from("billing_events").insert({
                    user_id: null,
                    kind: "cron_apply_pending_plans_error",
                    payload: { error: error?.message || String(error), ran_at: new Date().toISOString() },
                } as any);
            } catch { }

            return NextResponse.json(
                { ok: false, error: error?.message || "DB function error" },
                { status: 500 }
            );
        }

        const count = typeof data === "number" ? data : 0;
        console.log(`[Cron] apply_pending_plan_changes OK — ${count} profiles updated`);

        // Registrar resultado en billing_events
        try {
            await admin.from("billing_events").insert({
                user_id: null,
                kind: "cron_apply_pending_plans_ok",
                payload: { profiles_updated: count, ran_at: new Date().toISOString() },
            } as any);
        } catch { }

        return NextResponse.json({ ok: true, profiles_updated: count });

    } catch (e: any) {
        console.error("[Cron] Unexpected error:", e);
        return NextResponse.json(
            { ok: false, error: e?.message || "Unexpected error" },
            { status: 500 }
        );
    }
}
