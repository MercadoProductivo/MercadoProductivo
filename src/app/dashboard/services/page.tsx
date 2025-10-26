import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PackagePlus, MapPin } from "lucide-react";
import Image from "next/image";
import { GuardedCreateButton } from "@/components/dashboard/guarded-create-button";
import { Button } from "@/components/ui/button";
import FeatureServiceButton from "@/components/services/feature-service-button";
import { getNormalizedRoleFromUser } from "@/lib/auth/role";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ServicesDashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const isSeller = getNormalizedRoleFromUser(user) === "seller";

  // Campos faltantes del perfil para bloquear creación si no está completo
  let missingLabels: string[] = [];
  let planCode: string | null = null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("first_name,last_name,dni_cuit,address,city,province,postal_code,plan_code")
      .eq("id", user.id)
      .single();
    if (!error) {
      const requiredMap: Record<string, string> = {
        first_name: "Nombre",
        last_name: "Apellido",
        dni_cuit: "DNI/CUIT",
        address: "Dirección",
        city: "Localidad",
        province: "Provincia",
        postal_code: "CP",
      };
      Object.entries(requiredMap).forEach(([key, label]) => {
        // @ts-ignore
        if (!data?.[key] || String(data?.[key]).trim().length === 0) missingLabels.push(label);
      });
      // Plan actual (si existe)
      // @ts-ignore
      planCode = (data?.plan_code || "").toString() || null;
    }
  } catch {}

  // Traer servicios del usuario autenticado
  const {
    data: services,
    error: servicesError,
  } = await supabase
    .from("services")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Resolver límite de servicios del plan
  let maxServices: number | null = null;
  if (planCode) {
    try {
      const { data: plan } = await supabase
        .from("plans")
        .select("max_services")
        .eq("code", planCode)
        .maybeSingle();
      const ms = (plan as any)?.max_services;
      maxServices = typeof ms === "number" ? ms : (ms != null ? Number(ms) : null);
    } catch {}
  }
  // Conteo actual de servicios publicados desde la BD
  let currentCount = 0;
  try {
    const { count: publishedCount } = await supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("published", true);
    currentCount = publishedCount ?? 0;
  } catch {}

  const limitReached = typeof maxServices === "number" ? currentCount >= maxServices : false;

  // Ordenar: destacados vigentes primero, luego por fecha de creación desc
  const nowDate = new Date();
  const sortedServices = (services ?? []).slice().sort((a: any, b: any) => {
    const aFeat = a?.featured_until && new Date(a.featured_until) > nowDate ? 1 : 0;
    const bFeat = b?.featured_until && new Date(b.featured_until) > nowDate ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat; // primero destacados
    const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });

  const formatPrice = (value: number | null) => (value == null || Number(value) === 0)
    ? "Consultar"
    : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(Number(value));

  // Construir mapa de imagen principal por servicio desde service_images
  const primaryImageMap: Record<string, string | null> = {};
  try {
    const ids = (services ?? []).map((s: any) => s.id);
    if (ids.length) {
      const { data: imgs } = await supabase
        .from("service_images")
        .select("service_id,id,url")
        .in("service_id", ids)
        .order("id", { ascending: true });
      for (const row of imgs || []) {
        // @ts-ignore
        if (!primaryImageMap[row.service_id]) {
          // @ts-ignore
          primaryImageMap[row.service_id] = row.url as string;
        }
      }
    }
  } catch {}

  return (
    <div className="w-full p-4 space-y-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <h1 className="text-xl font-semibold sm:text-2xl">Mis servicios</h1>
        <GuardedCreateButton
          href="/dashboard/services/new"
          missingLabels={missingLabels}
          limitReached={limitReached}
          maxProducts={maxServices}
          currentCount={currentCount}
          entityLabelPlural="servicios"
          className="relative overflow-hidden group inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 sm:w-auto"
        >
          <span className="pointer-events-none absolute -left-20 top-0 h-full w-1/3 -skew-x-12 bg-white/30 transition-transform duration-500 group-hover:translate-x-[200%]" />
          <PackagePlus size={16} />
          <span>Nuevo Servicio</span>
        </GuardedCreateButton>
      </div>
      {!isSeller && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 sm:p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-emerald-800">
            ¿Querés publicar servicios? Cambiá tu cuenta a vendedor y empezá a vender.
          </div>
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
            <Link href="/ser-vendedor">Ser vendedor</Link>
          </Button>
        </div>
      )}
      {servicesError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 space-y-1">
          <div>No se pudieron cargar tus servicios: {servicesError.message}</div>
          {(() => {
            // @ts-ignore
            const code = (servicesError as any)?.code;
            // @ts-ignore
            const details = (servicesError as any)?.details;
            // @ts-ignore
            const hint = (servicesError as any)?.hint;
            if (code || details || hint) {
              return (
                <pre className="whitespace-pre-wrap break-words text-xs">
                  {JSON.stringify({ code, details, hint }, null, 2)}
                </pre>
              );
            }
            return null;
          })()}
        </div>
      )}

      <div className="text-xs text-muted-foreground">{`Mostrando ${services?.length ?? 0} servicio(s)`}</div>

      {(services?.length ?? 0) === 0 ? (
        <div className="rounded border p-4 text-sm text-muted-foreground bg-muted/10">
          No hay servicios todavía.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {sortedServices.map((s: any) => (
            <div key={s.id} className="overflow-hidden rounded border bg-background">
              <div className="relative h-32 w-full sm:h-40">
                {primaryImageMap[s.id] ? (
                  <Image src={primaryImageMap[s.id]!} alt={s.title} fill className="object-cover" />
                ) : (
                  <div className="h-full w-full bg-muted flex items-center justify-center">
                    <PackagePlus className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
                {s?.featured_until && new Date(s.featured_until) > new Date() && (
                  <div className="absolute left-2 top-2 rounded bg-orange-500 px-2 py-0.5 text-[10px] font-medium text-white shadow">
                    Destacado
                  </div>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <div className="line-clamp-2 text-sm font-medium sm:text-base mb-2">{s.title}</div>
                <div className="text-xs text-muted-foreground sm:text-sm mb-2">
                  {formatPrice(s.price)}
                </div>
                <div className="text-xs text-muted-foreground sm:text-sm mb-3 flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  <span className="truncate">{s.location || "Ubicación no especificada"}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm" className="flex-1 min-w-[80px] bg-white text-[#f06d04] border border-[#f06d04] hover:bg-[#f06d04]/10">
                    <Link href={`/dashboard/services/${s.id}`}>Ver detalles</Link>
                  </Button>
                  <Button asChild size="sm" className="flex-1 min-w-[60px] bg-orange-500 text-white hover:bg-orange-600">
                    <Link href={`/dashboard/services/${s.id}/edit`}>Editar</Link>
                  </Button>
                  <div className="w-full mt-1">
                    <FeatureServiceButton serviceId={s.id} featuredUntil={s.featured_until} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
