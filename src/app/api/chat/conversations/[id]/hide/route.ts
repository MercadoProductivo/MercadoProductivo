import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { getPusher } from "@/lib/pusher/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const uuidSchema = z.string().uuid();

// Shared helper for membership check and basic setup
async function validateRequest(ctx: { params: Promise<{ id: string }> }) {
  if (process.env.FEATURE_CHAT_V2_ENABLED !== "true") {
    return {
      error: NextResponse.json(
        { error: "CHAT_DESHABILITADO", message: "El sistema de chat v2 está temporalmente deshabilitado." },
        { status: 410 }
      ),
    };
  }

  const { id } = await ctx.params;
  const validation = uuidSchema.safeParse(id);
  if (!validation.success) {
    return {
      error: NextResponse.json(
        { error: "INVALID_CONVERSATION_ID", message: "ID de conversación inválido" },
        { status: 400 }
      ),
    };
  }
  const conversationId = validation.data;

  const supabase = await createRouteClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return { error: NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 }) };
  }

  // Verify membership
  const { data: mem, error: memErr } = await supabase
    .from("chat_conversation_members")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memErr) {
    return { error: NextResponse.json({ error: "MEMBERSHIP_CHECK_FAILED" }, { status: 500 }) };
  }
  if (!mem) {
    return { error: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }) };
  }

  return { conversationId, user, supabase };
}

// POST: Hide conversation
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const result = await validateRequest(ctx);
    if ("error" in result && result.error) return result.error;

    const { conversationId, user, supabase } = result as Awaited<ReturnType<typeof validateRequest>> & {
      conversationId: string;
      user: { id: string };
      supabase: any;
    };

    const { error: upErr } = await supabase
      .from("chat_conversation_members")
      .update({ hidden_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    if (upErr) {
      return NextResponse.json({ error: "HIDE_FAILED", message: upErr.message }, { status: 500 });
    }

    try {
      const p = getPusher();
      await p.trigger(`private-user-${user.id}`, "chat:conversation:hidden", {
        conversation_id: conversationId,
      });
    } catch {
      // Non-critical: swallow Pusher errors
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: e?.message || String(e) }, { status: 500 });
  }
}

// DELETE: Restore (unhide) conversation
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const result = await validateRequest(ctx);
    if ("error" in result && result.error) return result.error;

    const { conversationId, user, supabase } = result as Awaited<ReturnType<typeof validateRequest>> & {
      conversationId: string;
      user: { id: string };
      supabase: any;
    };

    const { error: upErr } = await supabase
      .from("chat_conversation_members")
      .update({ hidden_at: null })
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id);

    if (upErr) {
      return NextResponse.json({ error: "RESTORE_FAILED", message: upErr.message }, { status: 500 });
    }

    try {
      const p = getPusher();
      await p.trigger(`private-user-${user.id}`, "chat:conversation:restored", {
        conversation_id: conversationId,
      });
    } catch {
      // Non-critical: swallow Pusher errors
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "INTERNAL_ERROR", message: e?.message || String(e) }, { status: 500 });
  }
}
