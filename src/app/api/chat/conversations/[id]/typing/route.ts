import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getPusher } from "@/lib/pusher/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  if (process.env.FEATURE_CHAT_V2_ENABLED !== "true") {
    return NextResponse.json(
      { error: "CHAT_DESHABILITADO", message: "El sistema de chat v2 está temporalmente deshabilitado." },
      { status: 410 }
    );
  }
  try {
    const conversationId = String(ctx.params.id || "");
    if (!conversationId) return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });

    const supabase = createRouteClient();
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    // Verificar membresía
    const { data: mem, error: memErr } = await supabase
      .from("chat_conversation_members")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (memErr) return NextResponse.json({ error: "MEMBERSHIP_CHECK_FAILED" }, { status: 500 });
    if (!mem) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const typing = Boolean(body?.typing);

    // Emitir evento de typing a los miembros de la conversación
    try {
      const p = getPusher();
      await p.trigger(`private-conversation-${conversationId}`, "chat:typing", {
        user_id: user.id,
        typing,
      } as any);
    } catch (e) {
      // No fallar la respuesta por problemas de entrega del evento
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: e?.message || String(e) }, { status: 500 });
  }
}
