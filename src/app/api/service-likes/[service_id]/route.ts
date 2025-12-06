import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ service_id: string }> }) {
  try {
    const { service_id } = await ctx.params;
    const serviceId = service_id;
    if (!serviceId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    const supabase = createRouteClient();

    const { data: countRows } = await supabase
      .from("v_service_likes_count")
      .select("likes_count")
      .eq("service_id", serviceId)
      .limit(1);
    const likes_count = countRows?.[0]?.likes_count ?? 0;

    const { data: auth } = await supabase.auth.getUser();
    let liked = false;
    if (auth?.user) {
      const { data: likedRows } = await supabase
        .from("service_likes")
        .select("liker_user_id")
        .eq("liker_user_id", auth.user.id)
        .eq("service_id", serviceId)
        .limit(1);
      liked = !!(likedRows && likedRows.length > 0);
    }

    return NextResponse.json({ likes_count, liked });
  } catch (e: any) {
    logger.error("GET /api/service-likes/[service_id] failed", {
      error: e?.message,
    });
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function POST(_req: Request, ctx: { params: Promise<{ service_id: string }> }) {
  try {
    const { service_id } = await ctx.params;
    const serviceId = service_id;
    if (!serviceId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    const supabase = createRouteClient();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Debe iniciar sesión para dar like" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: service, error: svcErr } = await admin
      .from("services")
      .select("id,user_id")
      .eq("id", serviceId)
      .single();
    if (svcErr || !service) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Servicio no encontrado" }, { status: 404 });
    }

    if (service.user_id === user.id) {
      return NextResponse.json({ error: "SELF_LIKE_FORBIDDEN", message: "No puedes dar like a tu propio servicio" }, { status: 400 });
    }

    const { data: likedRows } = await supabase
      .from("service_likes")
      .select("liker_user_id")
      .eq("liker_user_id", user.id)
      .eq("service_id", serviceId)
      .limit(1);

    let liked = false;
    if (likedRows && likedRows.length > 0) {
      const { error: delErr } = await supabase
        .from("service_likes")
        .delete()
        .eq("liker_user_id", user.id)
        .eq("service_id", serviceId);
      if (delErr) {
        logger.error("Failed to delete service like", { service_id: serviceId, user_id: user.id, error: delErr.message });
        return NextResponse.json({ error: delErr.message || "No se pudo quitar el like" }, { status: 500 });
      }
      liked = false;
    } else {
      const { error: insErr } = await supabase
        .from("service_likes")
        .insert({ liker_user_id: user.id, service_id: serviceId });
      if (insErr) {
        logger.error("Failed to insert service like", { service_id: serviceId, user_id: user.id, error: insErr.message });
        const msg = insErr.message || "No se pudo dar like";
        if (msg.toLowerCase().includes("self_like")) {
          return NextResponse.json({ error: "SELF_LIKE_FORBIDDEN", message: "No puedes dar like a tu propio servicio" }, { status: 400 });
        }
        return NextResponse.json({ error: msg }, { status: 500 });
      }
      liked = true;
    }

    const { data: countRows } = await supabase
      .from("v_service_likes_count")
      .select("likes_count")
      .eq("service_id", serviceId)
      .limit(1);
    const likes_count = countRows?.[0]?.likes_count ?? 0;

    return NextResponse.json({ liked, likes_count });
  } catch (e: any) {
    console.error("[/api/service-likes] POST error", {
      message: e?.message,
      stack: e?.stack,
    });
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
