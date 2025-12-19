"use server";

import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getNormalizedRoleFromUser } from "@/lib/auth/role";
import { z } from "zod";

const productPayloadSchema = z.object({
    title: z.string().min(3).max(20),
    description: z.string().min(10).max(250),
    category: z.string().min(1),
    price: z.number().positive(),
    quantity_value: z.number().positive(),
    quantity_unit: z.enum(["unidad", "kg", "tn"]),
    location: z.string().min(1),
});

export async function POST(req: Request) {
    try {
        const supabase = await createRouteClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "UNAUTHORIZED", message: "No autenticado" },
                { status: 401 }
            );
        }

        // Solo vendedores pueden crear productos
        const role = getNormalizedRoleFromUser(user);
        if (role !== "seller") {
            return NextResponse.json(
                { error: "FORBIDDEN", message: "Solo los vendedores pueden crear productos" },
                { status: 403 }
            );
        }

        // Parsear y validar el body
        const body = await req.json();
        const validation = productPayloadSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: "VALIDATION_ERROR", message: validation.error.message },
                { status: 400 }
            );
        }

        const { title, description, category, price, quantity_value, quantity_unit, location } = validation.data;

        // Usar cliente Admin para bypass de RLS
        const admin = createAdminClient();

        // Verificar límite del plan
        const { data: profile } = await admin
            .from("profiles")
            .select("plan_code")
            .eq("id", user.id)
            .single();

        const planCode = (profile?.plan_code || "free").toLowerCase();

        // Obtener límites del plan
        const { data: planData } = await admin
            .from("plans")
            .select("max_products")
            .eq("code", planCode)
            .single();

        const maxProducts = planData?.max_products ?? 5;

        // Contar productos actuales
        const { count: currentCount } = await admin
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("published", true);

        if (typeof maxProducts === "number" && (currentCount ?? 0) >= maxProducts) {
            return NextResponse.json(
                {
                    error: "LIMIT_REACHED",
                    message: `Límite alcanzado: tu plan permite hasta ${maxProducts} productos.`,
                    maxProducts,
                    currentCount
                },
                { status: 400 }
            );
        }

        // Insertar producto con cliente Admin (bypass RLS)
        const { data: createdProduct, error: insertError } = await admin
            .from("products")
            .insert({
                user_id: user.id,
                title: title.trim(),
                description: description.trim(),
                category,
                price,
                quantity_value,
                quantity_unit,
                location,
                published: true,
                created_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (insertError) {
            console.error("[/api/products/create] Insert error:", insertError);
            return NextResponse.json(
                { error: insertError.message, code: insertError.code },
                { status: 500 }
            );
        }

        return NextResponse.json({
            ok: true,
            product: createdProduct,
        });
    } catch (e: any) {
        console.error("[/api/products/create] Unexpected error:", e);
        return NextResponse.json(
            { error: e?.message || "Error inesperado" },
            { status: 500 }
        );
    }
}
