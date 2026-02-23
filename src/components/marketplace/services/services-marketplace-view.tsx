"use client";

import { useState, useEffect } from "react";
import ServicesBannerSlider from "./services-banner-slider";
import FeaturedServicesCarousel from "./featured-services-carousel";
import ServiceFilters, { type ServiceFilters as ServiceFiltersType } from "./service-filters";
import ServicesGrid from "./services-grid";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, Users, TrendingUp, Shield, Plus, ArrowRight, Sparkles } from "lucide-react";

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
        const roleRaw = (user.user_metadata?.role_code || "").toString();
        const roleNormalized = roleRaw === "anunciante" ? "seller" : roleRaw;
        setIsVendor(roleNormalized === "seller");
      } else {
        setIsVendor(false);
      }
    })();
  }, [supabase]);

  useEffect(() => {
    async function loadFilterData() {
      try {
        setIsLoading(true);

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
        } catch { }
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
          } catch { }
        }
        setCategories(resolvedCategories);

        const { data: locs } = await supabase
          .from("services")
          .select("location")
          .eq("published", true)
          .not("location", "is", null);
        const uniqueLocations = Array.from(new Set((locs?.map((r: any) => r.location) || []).filter(Boolean))).sort();
        setLocations(uniqueLocations);

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
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <ServicesBannerSlider />

      {/* Stats Bar */}
      <section className="relative -mt-8 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard icon={Briefcase} value="500+" label="Servicios activos" color="orange" />
            <StatCard icon={Users} value="200+" label="Profesionales" color="blue" />
            <StatCard icon={TrendingUp} value="1000+" label="Conexiones" color="green" />
            <StatCard icon={Shield} value="100%" label="Verificados" color="purple" />
          </div>
        </div>
      </section>

      {/* Featured Services */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-orange-500" />
                Servicios Destacados
              </h2>
              <p className="text-muted-foreground mt-1">Los más valorados por la comunidad</p>
            </div>
          </div>
          <FeaturedServicesCarousel />
        </div>
      </section>

      {/* All Services Section */}
      <section id="servicios" className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              Todos los Servicios
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-orange-500 to-amber-500 mx-auto rounded-full mb-4" />
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explora servicios profesionales para tu cadena agroindustrial
            </p>
          </div>

          {/* Filters */}
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

          {/* Grid */}
          <ServicesGrid
            filters={filters}
            onServicesCountChange={setTotalServices}
            variant="comfortable"
            pageSize={20}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 sm:p-12">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative text-center">
              <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 text-sm font-medium px-4 py-2 rounded-full mb-6">
                <Briefcase className="h-4 w-4" />
                ¿Eres profesional?
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
                Ofrece tus servicios
              </h2>
              <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">
                Únete a nuestra comunidad y conecta con miles de compradores del sector agroindustrial
              </p>

              {user ? (
                isVendor ? (
                  <Link
                    href="/dashboard/services/new"
                    className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-orange-500/25"
                  >
                    <Plus className="h-5 w-5" />
                    Publicar Servicio
                  </Link>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      type="button"
                      onClick={() => router.push("/ser-vendedor")}
                      className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-xl transition-all"
                    >
                      Convertirme en vendedor
                      <ArrowRight className="h-5 w-5" />
                    </button>
                    <Link
                      href="/plans"
                      className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white hover:text-slate-900 text-white font-semibold px-8 py-4 rounded-xl transition-all border border-white/20"
                    >
                      Ver planes
                    </Link>
                  </div>
                )
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-xl transition-all shadow-lg shadow-orange-500/25"
                  >
                    Crear cuenta gratis
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/plans"
                    className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white hover:text-slate-900 text-white font-semibold px-8 py-4 rounded-xl transition-all border border-white/20"
                  >
                    Ver planes
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
              ¿Por qué publicar aquí?
            </h2>
            <p className="text-muted-foreground">Beneficios exclusivos para profesionales</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BenefitCard
              icon={Users}
              title="Alcance B2B"
              description="Conecta directamente con empresas y productores del sector agroindustrial"
              color="blue"
            />
            <BenefitCard
              icon={TrendingUp}
              title="Visibilidad"
              description="Destaca tus servicios y aparece en las búsquedas prioritarias"
              color="green"
            />
            <BenefitCard
              icon={Shield}
              title="Confianza"
              description="Plataforma verificada con reseñas y valoraciones de clientes"
              color="purple"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper Components
function StatCard({ icon: Icon, value, label, color }: { icon: any; value: string; label: string; color: string }) {
  const colorClasses: Record<string, string> = {
    orange: "bg-orange-100 text-orange-600",
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center flex-shrink-0`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function BenefitCard({ icon: Icon, title, description, color }: { icon: any; title: string; description: string; color: string }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
  };

  return (
    <div className="bg-card rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-4`}>
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
