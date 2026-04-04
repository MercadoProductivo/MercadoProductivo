import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMPConfig } from "@/lib/mercadopago/config";
import { MPApiClient } from "@/lib/services/billing";

export const dynamic = "force-dynamic";
export const revalidate = 0;


export async function POST() {
  const supabase = await createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const admin = createAdminClient();
  
  try {
    getMPConfig(); // Validar configuración
  } catch (error) {
    return NextResponse.json(
      { error: "MP_CONFIG_ERROR", message: String(error) },
      { status: 500 }
    );
  }

  // Perfil actual
  const { data: profile } = await admin
    .from("profiles")
    .select("id, mp_preapproval_id, mp_subscription_status, plan_code")
    .eq("id", user.id)
    .maybeSingle();

  const oldPreId = (profile as any)?.mp_preapproval_id || null;

  // Buscar el último preapproval pausado por downgrade para este usuario
  const { data: events } = await admin
    .from("billing_events")
    .select("id, kind, payload, created_at")
    .eq("user_id", user.id)
    .eq("kind", "preapproval_paused_on_downgrade")
    .order("created_at", { ascending: false })
    .limit(1);

  const pausedEvent = Array.isArray(events) && events.length > 0 ? (events[0] as any) : null;
  const newPreId = pausedEvent?.payload?.preapproval_id || null;

  let resumed = false;
  let nextRenewsAt: string | null = null;
  if (newPreId) {
    try {
      // C2: usar MPApiClient.authorizePreapproval en vez de fetch directo
      await MPApiClient.authorizePreapproval(newPreId);
      resumed = true;
      // Obtener detalles del preapproval para calcular próxima renovación
      try {
        const pre = await MPApiClient.getPreapproval(newPreId);
        const now = new Date();
        const renews = new Date(now);
        const freq = (pre.auto_recurring as Record<string, unknown> | undefined)?.frequency as number | undefined ?? 1;
        const ftype = (pre.auto_recurring as Record<string, unknown> | undefined)?.frequency_type as string | undefined ?? "months";
        if (ftype === "months") {
          renews.setMonth(renews.getMonth() + (typeof freq === "number" && freq > 0 ? freq : 1));
        } else if (ftype === "days") {
          renews.setDate(renews.getDate() + (typeof freq === "number" && freq > 0 ? freq : 30));
        } else {
          renews.setMonth(renews.getMonth() + 1);
        }
        nextRenewsAt = renews.toISOString();
      } catch {}

      await admin
        .from("profiles")
        .update({ mp_preapproval_id: newPreId, mp_subscription_status: "authorized", ...(nextRenewsAt ? { plan_renews_at: nextRenewsAt } : {}) })
        .eq("id", user.id);
      try {
        await admin.from("billing_events").insert({
          user_id: user.id,
          kind: "preapproval_resumed_on_post_apply",
          payload: { preapproval_id: newPreId, renews_at: nextRenewsAt },
        } as any);
      } catch {}
    } catch {}
  }

  if (resumed && oldPreId && oldPreId !== newPreId) {
    try {
      // C2: usar MPApiClient.cancelPreapproval en vez de fetch directo
      await MPApiClient.cancelPreapproval(oldPreId);
      try {
        await admin.from("billing_events").insert({
          user_id: user.id,
          kind: "preapproval_cancelled_on_post_apply",
          payload: { previous_preapproval_id: oldPreId } as any,
        } as any);
      } catch {}
    } catch {}
  }

  try {
    await admin.from("billing_events").insert({
      user_id: user.id,
      kind: "post_apply_preapproval_switch",
      payload: { from: oldPreId, to: newPreId, resumed },
    } as any);
  } catch {}

  return NextResponse.json({ ok: true, from: oldPreId, to: newPreId, resumed, renews_at: nextRenewsAt });
}

