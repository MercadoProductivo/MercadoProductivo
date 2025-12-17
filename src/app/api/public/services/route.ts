import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { createRouteClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = await createRouteClient();
  
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, Math.min(100, parseInt(searchParams.get("pageSize") || "20", 10)));

    const search = (searchParams.get("search") || "").trim();
    const category = searchParams.get("category") || "all";
    const minPrice = parseFloat(searchParams.get("minPrice") || "0");
    const maxPrice = parseFloat(searchParams.get("maxPrice") || "999999999");
    const location = searchParams.get("location") || "all";
    const sortBy = searchParams.get("sortBy") || "newest";
    const onlyFeatured = (searchParams.get("onlyFeatured") || "false") === "true";
    const sellerId = searchParams.get("sellerId") || undefined;
    const excludeServiceId = searchParams.get("excludeServiceId") || undefined;
    const excludeSellerId = searchParams.get("excludeSellerId") || undefined;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("services")
      .select("*", { count: "exact" })
      .eq("published", true);

    if (sellerId) query = query.eq("user_id", sellerId);
    if (excludeServiceId) query = query.neq("id", excludeServiceId);
    if (excludeSellerId) query = query.neq("user_id", excludeSellerId);

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,category.ilike.%${search}%`
      );
    }
    
    if (category && category !== "all") query = query.eq("category", category);
    
    if (minPrice > 0 || maxPrice < 999999999) {
      query = query.gte("price", minPrice).lte("price", maxPrice);
    }
    
    if (location && location !== "all") query = query.eq("location", location);
    
    if (onlyFeatured) {
      query = query
        .not("featured_until", "is", null)
        .gte("featured_until", new Date().toISOString());
    }

    switch (sortBy) {
      case "newest": 
        query = query.order("created_at", { ascending: false }); 
        break;
      case "oldest": 
        query = query.order("created_at", { ascending: true }); 
        break;
      case "price_asc": 
        query = query.order("price", { ascending: true, nullsFirst: true }); 
        break;
      case "price_desc": 
        query = query.order("price", { ascending: false, nullsFirst: false }); 
        break;
      case "featured":
        query = query
          .order("featured_until", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });
        break;
      case "alphabetical": 
        query = query.order("title", { ascending: true }); 
        break;
      default: 
        query = query.order("created_at", { ascending: false });
    }

    const { data: services, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const candidates = services || [];
    if (candidates.length === 0) {
      return NextResponse.json({ 
        items: [], 
        page, 
        pageSize, 
        total: 0, 
        hasMore: false 
      });
    }

    // Obtener perfiles para los vendedores
    const userIdsAll = Array.from(new Set(candidates.map((p: any) => p.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, plan_code, first_name, last_name, city, province, company")
      .in("id", userIdsAll);

    const profileById = new Map<string, any>();
    for (const prof of (profiles || []) as any[]) {
      profileById.set(prof.id, prof);
    }

    const freeCodes = new Set(["gratis", "free", "basic"]);
    const plusCodes = new Set(["plus", "enterprise", "premium", "pro"]);
    const deluxeCodes = new Set(["deluxe", "diamond"]);
    
    // Función para obtener el límite según el plan
    const getSellerLimit = (uid: string) => {
      const code = String(profileById.get(uid)?.plan_code || "").toLowerCase();
      if (freeCodes.has(code)) return 1;
      if (plusCodes.has(code)) return 15;
      if (deluxeCodes.has(code)) return 30;
      return 999999; // Sin límite para otros planes
    };

    // Aplicar límites por plan
    let filteredAll = candidates as typeof candidates;
    if (sellerId) {
      // Si es página de vendedor, solo mostrar sus servicios (ya filtrado)
      const sellerItems = candidates.filter((p: any) => 
        p.user_id === sellerId && (!excludeServiceId || p.id !== excludeServiceId)
      );
      const limit = getSellerLimit(sellerId);
      filteredAll = sellerItems.slice(0, Math.max(0, limit));
    } else {
      // Para listado general, aplicar límites por vendedor
      const usedBySeller = new Map<string, number>();
      const acc: typeof candidates = [];
      
      for (const p of candidates) {
        const uid = p.user_id as string;
        const limit = getSellerLimit(uid);
        const used = usedBySeller.get(uid) ?? 0;
        if (used >= limit) continue;
        usedBySeller.set(uid, used + 1);
        acc.push(p);
      }
      
      filteredAll = acc;
    }

    // Paginación
    const total = filteredAll.length;
    const pageItems = filteredAll.slice(from, to + 1);

    // Consultar portada (primera imagen) para cada servicio de la página
    let coverByServiceId = new Map<string, string | null>();
    try {
      const ids = Array.from(new Set(pageItems.map((p: any) => p.id))).filter(Boolean);
      if (ids.length) {
        let imgs: Array<{ service_id: string; url: string }> | null = null;
        try {
          const supabaseAdmin = createAdminClient();
          const { data } = await supabaseAdmin
            .from("service_images")
            .select("service_id,url,id")
            .in("service_id", ids)
            .order("id", { ascending: true });
          imgs = (data as any) || null;
        } catch {
          // Fallback al cliente normal si no hay Service Role disponible
          const { data } = await supabase
            .from("service_images")
            .select("service_id,url,id")
            .in("service_id", ids)
            .order("id", { ascending: true });
          imgs = (data as any) || null;
        }
        const firstById = new Map<string, string | null>();
        for (const row of (imgs || []) as Array<{ service_id: string; url: string }>) {
          if (!firstById.has(row.service_id)) firstById.set(row.service_id, row.url || null);
        }
        coverByServiceId = firstById;
      }
    } catch {
      // si falla (tabla no existe/RLS), dejamos sin portada
      coverByServiceId = new Map();
    }

    // Enriquecer con datos de perfil
    const withProfiles = pageItems.map((p: any) => ({
      ...p,
      cover_url: coverByServiceId.get(p.id) || null,
      profiles: (() => {
        const prof = profileById.get(p.user_id) || {};
        return {
          first_name: prof.first_name,
          last_name: prof.last_name,
          city: prof.city,
          province: prof.province,
          company: prof.company,
          plan_code: prof.plan_code,
        };
      })(),
    }));

    const hasMore = from + withProfiles.length < total;

    return NextResponse.json({
      items: withProfiles,
      page,
      pageSize,
      total,
      hasMore,
    });

  } catch (e: any) {
    logger.error("GET /api/public/services failed", { error: e?.message });
    return NextResponse.json(
      { error: e?.message || "Error interno del servidor" },
      { status: 500 }
    );
  }
}

