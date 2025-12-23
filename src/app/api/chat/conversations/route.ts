import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { normalizeAvatarUrl } from "@/lib/avatar";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(req: Request) {
  // Feature flag check removed or kept based on preference, currently keeping it but warning if env is missing
  if (process.env.FEATURE_CHAT_V2_ENABLED !== "true") {
    // If not enabled, return 410 or fallback. 
    // Ideally we want to fix it, so let's assume valid config.
    // For debugging, we can log this.

    return NextResponse.json(
      {
        error: "CHAT_DESHABILITADO",
        message: "El sistema de chat v2 está temporalmente deshabilitado.",
      },
      { status: 410 }
    );
  }

  try {
    const supabase = await createRouteClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // Call the optimized V2 RPC
    const { data: rawData, error } = await supabase.rpc("chat_get_conversations_v2", {
      p_user_id: user.id
    });

    if (error) {
      console.error("RPC Error chat_get_conversations_v2:", error);
      return NextResponse.json({ error: "RPC_ERROR", message: error.message }, { status: 500 });
    }

    // data from V2 RPC matches the frontend expectations mostly, but we might need to normalize avatars
    const conversations = (rawData || []).map((row: any) => ({
      id: row.id,
      counterparty_id: row.counterparty_id,
      counterparty_name: row.counterparty_name || "Usuario",
      counterparty_avatar_url: normalizeAvatarUrl(row.counterparty_avatar_url, supabase),
      last_created_at: row.last_created_at, // V2 returns this column name directly
      preview: row.preview || "Mensaje",
      unread_count: row.unread_count || 0,
    }));

    return NextResponse.json({ conversations });
  } catch (e: any) {
    console.error("Internal Error /api/chat/conversations:", e);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: e?.message || String(e) }, { status: 500 });
  }
}
