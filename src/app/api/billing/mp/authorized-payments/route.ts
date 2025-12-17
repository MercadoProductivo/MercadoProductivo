import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getMPConfig } from "@/lib/mercadopago/config";
import { BillingService } from "@/lib/services/billing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const supabase = await createRouteClient();

    // 1) Usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });

    // 2) Traer mp_preapproval_id del perfil
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("id, mp_preapproval_id, plan_code, plan_renews_at, mp_subscription_status")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr)
      return NextResponse.json({ ok: false, error: "profile_fetch_failed", details: profileErr.message }, { status: 500 });

    const preapprovalId = (profile as any)?.mp_preapproval_id as string | null;
    if (!preapprovalId) {
      return NextResponse.json({
        ok: true,
        profile,
        preapproval_id: null,
        authorized_payment: null,
        note: "No hay mp_preapproval_id asociado al perfil",
      });
    }

    // 3) Validar configuración MP
    getMPConfig(); // Throws if invalid

    // Parámetros de consulta
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("payment_id") || searchParams.get("id");

    // 4) Si se provee payment_id, obtener ese authorized_payment
    if (paymentId) {
      try {
        const authorizedPayment = await BillingService.getAuthorizedPayment(paymentId);
        return NextResponse.json({
          ok: true,
          profile,
          preapproval_id: preapprovalId,
          authorized_payment: authorizedPayment,
          note: "Mostrando un authorized_payment por ID.",
        });
      } catch (err: any) {
        return NextResponse.json({
          ok: false,
          profile,
          preapproval_id: preapprovalId,
          error: "authorized_payment_fetch_failed",
          details: err.message,
        }, { status: 502 });
      }
    }

    // 5) Sin payment_id, devolver detalles del preapproval para diagnóstico
    let pre = null;
    try {
      pre = await BillingService.getPreapproval(preapprovalId);
    } catch {
      // Ignorar error si falla preapproval info (opcional para diagnóstico)
    }

    return NextResponse.json({
      ok: true,
      profile,
      preapproval_id: preapprovalId,
      authorized_payment: null,
      preapproval: pre,
      note: "Listado de authorized_payments por preapproval_id no disponible en la API pública. Usa payment_id o valida vía webhooks.",
    });

  } catch (error: any) {
    return NextResponse.json({
      ok: true,
      error: "internal_error",
      note: String(error),
    }, { status: 500 });
  }
}
