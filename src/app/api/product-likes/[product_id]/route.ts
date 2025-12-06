import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ product_id: string }> }) {
  try {
    const { product_id } = await ctx.params;
    const productId = product_id;
    if (!productId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    const supabase = createRouteClient();

    const { data: countRows } = await supabase
      .from("v_product_likes_count")
      .select("likes_count")
      .eq("product_id", productId)
      .limit(1);
    const likes_count = countRows?.[0]?.likes_count ?? 0;

    const { data: auth } = await supabase.auth.getUser();
    let liked = false;
    if (auth?.user) {
      const { data: likedRows } = await supabase
        .from("product_likes")
        .select("liker_user_id")
        .eq("liker_user_id", auth.user.id)
        .eq("product_id", productId)
        .limit(1);
      liked = !!(likedRows && likedRows.length > 0);
    }

    return NextResponse.json({ likes_count, liked });
  } catch (e: any) {
    logger.error("GET /api/product-likes/[product_id] failed", {
      error: e?.message,
    });
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}

export async function POST(_req: Request, ctx: { params: Promise<{ product_id: string }> }) {
  try {
    const { product_id } = await ctx.params;
    const productId = product_id;
    if (!productId) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

    const supabase = createRouteClient();
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) {
      return NextResponse.json({ error: "UNAUTHORIZED", message: "Debe iniciar sesión para dar like" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: product, error: prodErr } = await admin
      .from("products")
      .select("id,user_id")
      .eq("id", productId)
      .single();
    if (prodErr || !product) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Producto no encontrado" }, { status: 404 });
    }

    if (product.user_id === user.id) {
      return NextResponse.json({ error: "SELF_LIKE_FORBIDDEN", message: "No puedes dar like a tu propio producto" }, { status: 400 });
    }

    // ¿Ya existe like?
    const { data: likedRows } = await supabase
      .from("product_likes")
      .select("liker_user_id")
      .eq("liker_user_id", user.id)
      .eq("product_id", productId)
      .limit(1);

    let liked = false;
    if (likedRows && likedRows.length > 0) {
      const { error: delErr } = await supabase
        .from("product_likes")
        .delete()
        .eq("liker_user_id", user.id)
        .eq("product_id", productId);
      if (delErr) {
        logger.error("Failed to delete product like", { product_id: productId, user_id: user.id, error: delErr.message });
        return NextResponse.json({ error: delErr.message || "No se pudo quitar el like" }, { status: 500 });
      }
      liked = false;
    } else {
      const { error: insErr } = await supabase
        .from("product_likes")
        .insert({ liker_user_id: user.id, product_id: productId });
      if (insErr) {
        logger.error("Failed to insert product like", { product_id: productId, user_id: user.id, error: insErr.message });
        const msg = insErr.message || "No se pudo dar like";
        if (msg.toLowerCase().includes("prevent_self_like") || msg.toLowerCase().includes("self_like")) {
          return NextResponse.json({ error: "SELF_LIKE_FORBIDDEN", message: "No puedes dar like a tu propio producto" }, { status: 400 });
        }
        return NextResponse.json({ error: msg }, { status: 500 });
      }
      liked = true;
    }

    const { data: countRows } = await supabase
      .from("v_product_likes_count")
      .select("likes_count")
      .eq("product_id", productId)
      .limit(1);
    const likes_count = countRows?.[0]?.likes_count ?? 0;

    return NextResponse.json({ liked, likes_count });
  } catch (e: any) {
    console.error("[/api/product-likes] POST error", {
      message: e?.message,
      stack: e?.stack,
    });
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
