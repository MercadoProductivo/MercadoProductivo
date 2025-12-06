"use client";

import { useState, useEffect } from "react";
import ServicesBannerSlider from "./services-banner-slider";
import FeaturedServicesCarousel from "./featured-services-carousel";
import ServiceFilters, { type ServiceFilters as ServiceFiltersType } from "./service-filters";
import ServicesGrid from "./services-grid";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ServicesMarketplaceView() {
  const [filters, setFilters] = useState<ServiceFiltersType>({
    search: "",
    category: "all",
    minPrice: 0,
    maxPrice: 999999999,
    location: "all",
    sortBy: "newest",
    onlyFeatured: false,
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: 0, max: 999999999 });
  const [totalServices, setTotalServices] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isVendor, setIsVendor] = useState<boolean>(false);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user ?? null);
      if (user) {
        const roleRaw = (user.user_metadata?.role || user.user_metadata?.user_type || "").toString();
        const roleNormalized = roleRaw === "anunciante" ? "seller" : roleRaw;
        setIsVendor(roleNormalized === "seller");
      } else {
        setIsVendor(false);
      }
    })();
  }, [supabase]);

  // Cargar datos iniciales para filtros desde services
  useEffect(() => {
    async function loadFilterData() {
      try {
        setIsLoading(true);

        // Categorías: primero desde services.category (publicadas), fallback a tabla categories
        let resolvedCategories: string[] = [];
        try {
          const { data: cat } = await supabase
            .from("services")
            .select("category")
            .eq("published", true)
            .not("category", "is", null);
          resolvedCategories = Array.from(
            new Set((cat?.map((r: any) => String(r.category || "").trim()) || []).filter(Boolean))
          ).sort((a, b) => a.localeCompare(b));
        } catch {}
        if (!resolvedCategories.length) {
          try {
            const { data: catData, error: catError } = await supabase.from("categories").select("*");
            if (!catError && Array.isArray(catData)) {
              resolvedCategories = Array.from(new Set(
                (catData as any[])
                  .map(r => (r?.name ?? r?.title ?? r?.label ?? r?.slug ?? "").toString().replace(/[-_]/g, " ").trim())
                  .filter(Boolean)
              )).sort((a, b) => a.localeCompare(b));
            }
          } catch {}
        }
        setCategories(resolvedCategories);

        // Ubicaciones únicas de services.location
        const { data: locs } = await supabase
          .from("services")
          .select("location")
          .eq("published", true)
          .not("location", "is", null);
        const uniqueLocations = Array.from(new Set((locs?.map((r: any) => r.location) || []).filter(Boolean))).sort();
        setLocations(uniqueLocations);

        // Rango de precios (solo no null)
        const { data: priceData } = await supabase
          .from("services")
          .select("price")
          .eq("published", true)
          .not("price", "is", null)
          .order("price", { ascending: true });

        if (priceData && priceData.length > 0) {
          const prices = priceData.map((i: any) => Number(i.price));
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          setPriceRange({ min: minPrice, max: maxPrice });
          setFilters(prev => ({ ...prev, minPrice, maxPrice }));
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadFilterData();
  }, [supabase]);

  return (
    <div className="bg-white">
      <ServicesBannerSlider />

      <FeaturedServicesCarousel />

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Separator />
        </div>
      </div>

      <section id="servicios" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Todos los Servicios</h2>
            <div className="w-24 h-1 bg-orange-500 mx-auto mb-6"></div>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explora servicios profesionales para tu cadena agroindustrial
            </p>
          </div>

          <div className="mb-8">
            <ServiceFilters
              filters={filters}
              onFiltersChange={setFilters}
              categories={categories}
              locations={locations}
              priceRange={priceRange}
              totalServices={totalServices}
              isLoading={isLoading}
            />
          </div>

          <ServicesGrid
            filters={filters}
            onServicesCountChange={setTotalServices}
            variant="comfortable"
            pageSize={20}
          />
        </div>
      </section>

      {/* Sección de llamada a la acción */}
      <section className="py-16 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            ¿Tienes servicios para ofrecer?
          </h2>
          <p className="text-xl text-orange-100 mb-8">
            Únete a nuestra comunidad de vendedores y llega a miles de compradores
          </p>

          {user ? (
            isVendor ? (
              <div className="flex justify-center">
                <Link
                  href="/dashboard/services/new"
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md bg-white text-orange-600 hover:bg-orange-50 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Publicar servicio
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => router.push("/ser-vendedor")}
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-orange-600 bg-white hover:bg-orange-50 transition-colors"
                >
                  Cambiar a vendedor
                </button>
                <a
                  href="/planes"
                  className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-base font-medium rounded-md text-white hover:bg-white hover:text-orange-600 transition-colors"
                >
                  Ver planes
                </a>
              </div>
            )
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/auth/register"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-orange-600 bg-white hover:bg-orange-50 transition-colors"
              >
                Crear cuenta gratis
              </a>
              <a
                href="/planes"
                className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-base font-medium rounded-md text-white hover:bg-white hover:text-orange-600 transition-colors"
              >
                Ver planes
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
