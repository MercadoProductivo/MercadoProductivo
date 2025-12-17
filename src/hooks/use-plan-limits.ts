import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

export function usePlanLimits() {
    const supabase = useMemo(() => createClient(), []);
    const [maxFiles, setMaxFiles] = useState<number>(5);
    const [maxProducts, setMaxProducts] = useState<number | null>(null);
    const [productsCount, setProductsCount] = useState<number>(0);

    // Derivada
    const limitReached = useMemo(
        () => typeof maxProducts === "number" && productsCount >= maxProducts,
        [maxProducts, productsCount]
    );

    useEffect(() => {
        (async () => {
            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;

                // 1. Obtener conteo de productos actuales
                const { count } = await supabase
                    .from("products")
                    .select("id", { count: "exact", head: true })
                    .eq("user_id", user.id)
                    .eq("published", true);
                setProductsCount(count ?? 0);

                // 2. Obtener plan actual del perfil
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("plan_code")
                    .eq("id", user.id)
                    .single();
                const planCode = (profile?.plan_code || "").toString();

                if (!planCode) {
                    // Defaults si no hay plan
                    setMaxFiles(5);
                    setMaxProducts(null);
                    return;
                }

                // 3. Obtener límites del plan
                const { data: plan } = await supabase
                    .from("plans")
                    .select("max_images_per_product, max_products")
                    .eq("code", planCode)
                    .maybeSingle();

                if (plan) {
                    const maxImgs = Number((plan as any)?.max_images_per_product) || 5;
                    const maxProds = (plan as any)?.max_products;
                    setMaxFiles(maxImgs);
                    setMaxProducts(
                        typeof maxProds === "number" ? maxProds : maxProds != null ? Number(maxProds) : null
                    );
                }
            } catch (e) {
                console.error("Error fetching plan limits", e);
                // Fallbacks seguros
                setMaxFiles(5);
                setMaxProducts(null);
            }
        })();
    }, [supabase]);

    return {
        maxFiles,
        maxProducts,
        productsCount,
        limitReached,
    };
}
