import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  const supabase = createRouteClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  // Usar cliente Admin para evitar bloqueos por RLS y soportar ausencia de fila (upsert)
  try {
    const admin = createAdminClient();
    const { error: upsertErr } = await admin
      .from("profiles")
      .upsert({ id: user.id, role_code: "vendedor" }, { onConflict: "id" });
    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 400 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "ADMIN_CLIENT_ERROR" }, { status: 500 });
  }

  // Actualizar metadata del usuario para que la UI reaccione de inmediato
  const { error: updateAuthErr } = await supabase.auth.updateUser({ data: { role: "seller", user_type: "seller" } });
  if (updateAuthErr) {
    // No es crítico para el backend, pero lo informamos
    return NextResponse.json({ ok: true, warning: "PROFILE_UPDATED_BUT_METADATA_FAILED" });
  }

  return NextResponse.json({ ok: true });
}
