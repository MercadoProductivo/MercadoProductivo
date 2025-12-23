"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import BannerSlider from "@/components/marketplace/banner-slider";
import FeaturedProductsCarousel from "@/components/marketplace/featured-products-carousel";
import ProductFilters, { type ProductFilters as ProductFiltersType } from "@/components/marketplace/product-filters";
import ProductsGrid from "@/components/marketplace/products-grid";
import { Separator } from "@/components/ui/separator";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MarketplaceView() {
  const [filters, setFilters] = useState<ProductFiltersType>({
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
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isVendor, setIsVendor] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  const supabase = createClient();
  const router = useRouter();

  // Cargar usuario actual
  useEffect(() => {
    async function loadUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          // Normalizar rol (compat: usar user_type legacy si existe) y evaluar solo contra 'seller'
          const roleRaw = (user.user_metadata?.role || user.user_metadata?.user_type || "").toString();
          const roleNormalized = roleRaw === "anunciante" ? "seller" : roleRaw;
          setIsVendor(roleNormalized === "seller");
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
    }

    loadUser();
  }, [supabase]);

  // Confirmación para cambiar a vendedor
  const handleUpgrade = async () => {
    try {
      setUpgrading(true);
      const res = await fetch("/api/profile/upgrade-to-seller", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "No se pudo actualizar el rol");
        return;
      }
      toast.success("¡Listo! Tu cuenta ahora es de vendedor");
      setIsVendor(true);
      setUpgradeOpen(false);
      // Refrescar sesión para reflejar metadata actualizada
      try {
        const { data: u } = await supabase.auth.getUser();
        const roleRaw = (u?.user?.user_metadata?.role || u?.user?.user_metadata?.user_type || "").toString();
        const roleNormalized = roleRaw === "anunciante" ? "seller" : roleRaw;
        setIsVendor(roleNormalized === "seller");
      } catch { }
    } catch (e) {
      toast.error("Error al cambiar a vendedor");
    } finally {
      setUpgrading(false);
    }
  };

  // Detectar mobile para ajustar pageSize de ProductsGrid
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    } else {
      // @ts-ignore
      mq.addListener(update);
      return () => {
        // @ts-ignore
        mq.removeListener(update);
      };
    }
  }, []);

  // Cargar datos iniciales para filtros
  useEffect(() => {
    async function loadFilterData() {
      try {
        setIsLoading(true);

        // Categorías activas: derivadas exclusivamente de products publicados
        const { data: categoryData } = await supabase
          .from("products")
          .select("category")
          .eq("published", true)
          .not("category", "is", null);
        const resolvedCategories = Array.from(
          new Set((categoryData?.map((item) => (item as any)?.category?.toString().trim()) || []).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b));
        setCategories(resolvedCategories);

        // Cargar ubicaciones únicas desde products.location
        const { data: locationData } = await supabase
          .from("products")
          .select("location")
          .eq("published", true)
          .not("location", "is", null);

        const uniqueLocations = Array.from(
          new Set(
            (locationData?.map((item: { location: string | null }) => item.location) || [])
              .filter((loc): loc is string => Boolean(loc))
          )
        );
        setLocations(uniqueLocations.sort());

        // Cargar rango de precios
        const { data: priceData } = await supabase
          .from("products")
          .select("price")
          .eq("published", true)
          .order("price", { ascending: true });

        if (priceData && priceData.length > 0) {
          const prices = priceData.map((item) => item.price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);

          setPriceRange({ min: minPrice, max: maxPrice });
          setFilters((prev) => ({
            ...prev,
            minPrice,
            maxPrice,
          }));
        }
      } catch (error) {
        console.error("Error loading filter data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadFilterData();
  }, [supabase]);

  const handleFiltersChange = (newFilters: ProductFiltersType) => {
    setFilters(newFilters);
  };

  const handleProductsCountChange = (count: number) => {
    setTotalProducts(count);
  };

  return (
    <div className="bg-white">
      {/* Banner Principal */}
      <BannerSlider />

      {/* Productos Destacados */}
      <FeaturedProductsCarousel />

      {/* Separador */}
      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Separator />
        </div>
      </div>

      {/* Sección Principal del Marketplace */}
      <section id="productos" className="py-20 bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header de la sección con animación */}
          <div className="text-center mb-16 animate-in fade-in-0 slide-in-from-bottom-4 duration-700">
            <span className="inline-block px-4 py-1.5 bg-orange-100 text-orange-600 text-sm font-semibold rounded-full mb-4">
              🛒 Marketplace
            </span>
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent mb-6">
              Todos los Productos
            </h2>
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="h-1 w-12 bg-gradient-to-r from-transparent to-orange-500 rounded-full" />
              <div className="h-1.5 w-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full" />
              <div className="h-1 w-12 bg-gradient-to-l from-transparent to-orange-500 rounded-full" />
            </div>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Explora nuestra amplia selección de productos agroindustriales de la mejor calidad
            </p>
          </div>

          {/* Filtros con sombra suave */}
          <div className="mb-10 animate-in fade-in-0 slide-in-from-bottom-2 duration-500 delay-150">
            <ProductFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              categories={categories}
              locations={locations}
              priceRange={priceRange}
              totalProducts={totalProducts}
              isLoading={isLoading}
            />
          </div>

          {/* Grid de Productos */}
          <div className="animate-in fade-in-0 duration-500 delay-200">
            <ProductsGrid
              filters={filters}
              onProductsCountChange={handleProductsCountChange}
              variant="comfortable"
              pageSize={isMobile ? 10 : 20}
            />
          </div>
        </div>
      </section>

      {/* Sección de llamada a la acción */}
      <section className="relative py-20 overflow-hidden">
        {/* Fondo con gradiente y patrón */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full"
            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}
          />
        </div>

        <div className="relative max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm font-semibold rounded-full mb-6">
            🚀 Empieza a vender hoy
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            ¿Tienes productos para vender?
          </h2>
          <p className="text-xl text-orange-100 mb-10 max-w-2xl mx-auto">
            Únete a nuestra comunidad de vendedores y llega a miles de compradores
          </p>

          {/* CTA según estado y rol */}
          {user ? (
            isVendor ? (
              <div className="flex justify-center">
                <Link
                  href="/dashboard/products/new"
                  className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full bg-white text-orange-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Publicar ahora
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => router.push("/ser-vendedor")}
                  className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full text-orange-600 bg-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                  Cambiar a vendedor
                </button>
                <a
                  href="/planes"
                  className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full border-2 border-white text-white hover:bg-white hover:text-orange-600 transition-all duration-300"
                >
                  Ver planes
                </a>
              </div>
            )
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/auth/register"
                className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full text-orange-600 bg-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Crear cuenta gratis
              </a>
              <a
                href="/planes"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-full border-2 border-white text-white hover:bg-white hover:text-orange-600 transition-all duration-300"
              >
                Ver planes
              </a>
            </div>
          )}

          {/* Modal de confirmación: cambiar a vendedor */}
          <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cambiar a vendedor</DialogTitle>
                <DialogDescription>
                  Al confirmar, actualizaremos tu cuenta a vendedor para que puedas publicar productos y servicios.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="sm:justify-end gap-2">
                <Button variant="ghost" onClick={() => setUpgradeOpen(false)} disabled={upgrading}>Cancelar</Button>
                <Button onClick={handleUpgrade} disabled={upgrading}>{upgrading ? "Cambiando..." : "Confirmar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}
