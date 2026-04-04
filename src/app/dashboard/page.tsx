import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  Package,
  Briefcase,
  ArrowRight,
  LayoutGrid,
  Crown,
  TrendingUp,
  UserCircle,
  Zap,
  ChevronRight,
} from "lucide-react";
import { UsageRadial, CountdownUntil } from "@/components/dashboard/kpi-charts";
import DashboardHeaderBadges from "@/components/badges/dashboard-header-badges";
import { getNormalizedRoleFromUser } from "@/lib/auth/role";
import { normalizePlanCode, getPlanLabel } from "@/lib/plans";
import { GuardedCreateButton } from "@/components/dashboard/guarded-create-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Saludo según la hora local del servidor (AR) */
function getGreeting() {
  const hour = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", hour: "numeric", hour12: false });
  const h = parseInt(hour, 10);
  if (h >= 5 && h < 12) return "Buenos días";
  if (h >= 12 && h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const roleNormalized = getNormalizedRoleFromUser(user);
  if (roleNormalized === "buyer") redirect("/dashboard/profile");

  const firstNameFromMeta = (user.user_metadata?.first_name || user.user_metadata?.firstName || user.user_metadata?.full_name || "").toString().split(" ")[0];
  const emailVerified = Boolean(user.email_confirmed_at);
  const metaPlan = (user.user_metadata?.plan || user.user_metadata?.plan_code || "").toString();
  let planRaw = "";

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name, full_name, dni_cuit, company, address, city, province, postal_code, plan_code, updated_at, credits_balance")
    .eq("id", user.id)
    .single();

  planRaw = (profile?.plan_code || "").toString() || metaPlan;
  const planCodeNormalized = normalizePlanCode(planRaw);
  let planLabel = getPlanLabel(planRaw);

  const p_first = (profile?.first_name ?? user.user_metadata?.first_name ?? "").toString();
  const p_last = (profile?.last_name ?? user.user_metadata?.last_name ?? "").toString();
  const p_email = (user.email ?? "").toString();
  const p_dni_cuit = (profile?.dni_cuit ?? "").toString();
  const p_address = (profile?.address ?? "").toString();
  const p_city = (profile?.city ?? "").toString();
  const p_province = (profile?.province ?? "").toString();
  const p_cp = (profile?.postal_code ?? "").toString();
  const firstName = p_first || firstNameFromMeta || user.email?.split("@")[0] || "Usuario";

  const notEmpty = (s: string) => (s ?? "").toString().trim().length > 0;
  const missingLabels: string[] = [];
  if (!notEmpty(p_first)) missingLabels.push("Nombre");
  if (!notEmpty(p_last)) missingLabels.push("Apellido");
  if (!notEmpty(p_email)) missingLabels.push("Email");
  if (!notEmpty(p_dni_cuit)) missingLabels.push("DNI o CUIT");
  if (!notEmpty(p_address)) missingLabels.push("Dirección");
  if (!notEmpty(p_city)) missingLabels.push("Localidad");
  if (!notEmpty(p_province)) missingLabels.push("Provincia");
  if (!notEmpty(p_cp)) missingLabels.push("Código Postal");

  const planCode = (profile?.plan_code || metaPlan || "").toString();

  const { count: productsCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: plan } = planCode
    ? await supabase.from("plans").select("code, name, max_products, max_services, credits_monthly").eq("code", planCode).single()
    : ({ data: null } as const);

  if (plan?.name) planLabel = plan.name;
  if (!planRaw && roleNormalized === "seller") planLabel = "Gratis";

  const planCodeLower = (planCode || "").toLowerCase();
  const labelLower = (planLabel || "").toLowerCase();
  const isBasicPlan = /b[áa]sico/.test(labelLower) || ["free", "basic"].includes(planCodeLower);

  const now = new Date();
  const periodYM = now.getFullYear() * 100 + (now.getMonth() + 1);
  const { data: usage } = await supabase
    .from("usage_counters" as any)
    .select("credits_used")
    .eq("user_id", user.id)
    .eq("period_ym", periodYM)
    .maybeSingle();

  const creditsUsed = (usage as any)?.credits_used ?? 0;
  const creditsMonthly = plan?.credits_monthly ?? 0;
  const creditsBalance = (profile as any)?.credits_balance ?? 0;
  const maxProducts = plan?.max_products ?? null;
  const maxServices = (plan as any)?.max_services ?? null;

  const { count: servicesCount } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("published", true);

  const freeCodes = new Set(["gratis", "free", "basic"]);
  const plusCodes = new Set(["plus", "enterprise", "premium", "pro"]);
  const deluxeCodes = new Set(["deluxe", "diamond"]);
  const planVisibleLimit = (isBasicPlan || freeCodes.has(planCodeLower))
    ? 1
    : (plusCodes.has(planCodeLower) || /plus|enterprise|premium|pro/.test(labelLower))
      ? 15
      : (deluxeCodes.has(planCodeLower) || /deluxe|diamond/.test(labelLower))
        ? 30
        : (maxProducts ?? null);
  const exceedsVisible = typeof productsCount === "number" && planVisibleLimit != null && productsCount > planVisibleLimit;

  const activatedAt = planCode ? (profile as any)?.updated_at ?? null : null;
  let expiresAt: string | null = null;
  if (activatedAt) {
    const d = new Date(activatedAt);
    d.setMonth(d.getMonth() + 1);
    expiresAt = d.toISOString();
  }

  // Límite de servicios alcanzado
  const servicesLimitReached = maxServices != null && (servicesCount ?? 0) >= maxServices;
  const productsLimitReached = maxProducts != null && (productsCount ?? 0) >= maxProducts;

  const greeting = getGreeting();

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6 sm:p-6 sm:space-y-8">

      {/* ── HEADER ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 shadow-xl animate-in fade-in-0 slide-in-from-top-4 duration-500">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500 rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="text-white">
            <p className="text-sm text-slate-400 mb-1">
              {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Panel de Control</h1>
            <p className="text-slate-300 mt-1">{greeting}, {firstName} 👋</p>
          </div>
          <DashboardHeaderBadges emailVerified={emailVerified} planLabel={planLabel} planCode={planCode} />
        </div>
      </div>

      {/* ── ALERTA PERFIL INCOMPLETO ───────────────── */}
      {missingLabels.length > 0 && (
        <Alert className="border-amber-300 bg-amber-50 animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
          <div className="flex-1">
            <AlertTitle className="font-semibold text-amber-900">Perfil incompleto</AlertTitle>
            <AlertDescription className="mt-0.5 text-amber-800">
              Completá tu perfil para poder publicar productos y servicios:{" "}
              <strong className="font-semibold text-amber-900">{missingLabels.join(", ")}</strong>.
            </AlertDescription>
          </div>
          <Button asChild size="sm" className="ml-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white border-0">
            <Link href="/dashboard/profile">Completar perfil <ChevronRight className="h-3.5 w-3.5 ml-1" /></Link>
          </Button>
        </Alert>
      )}

      {/* ── ACCIONES RÁPIDAS ──────────────────────── */}
      <section className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-4 w-4 text-orange-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Acciones rápidas</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {/* Publicar Producto */}
          <GuardedCreateButton
            href="/dashboard/products/new"
            missingLabels={missingLabels}
            limitReached={productsLimitReached}
            maxProducts={maxProducts}
            currentCount={productsCount ?? 0}
            entityLabelPlural="productos"
            aria-label="Publicar nuevo producto"
            className="group relative overflow-hidden rounded-xl border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 p-5 text-left transition-all hover:border-orange-500 hover:shadow-lg hover:shadow-orange-100 hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white shadow-md group-hover:scale-110 transition-transform">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-slate-800 group-hover:text-orange-700 transition-colors">
                  Publicar Producto
                </div>
                <div className="text-xs text-slate-600 mt-0.5 font-medium">
                  {maxProducts != null
                    ? `${productsCount ?? 0} / ${maxProducts} publicados`
                    : `${productsCount ?? 0} publicado${(productsCount ?? 0) !== 1 ? "s" : ""}`}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </GuardedCreateButton>

          {/* Publicar Servicio */}
          <GuardedCreateButton
            href="/dashboard/services/new"
            missingLabels={missingLabels}
            limitReached={servicesLimitReached}
            maxProducts={maxServices}
            currentCount={servicesCount ?? 0}
            entityLabelPlural="servicios"
            aria-label="Publicar nuevo servicio"
            className="group relative overflow-hidden rounded-xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 to-blue-50 p-5 text-left transition-all hover:border-sky-500 hover:shadow-lg hover:shadow-sky-100 hover:-translate-y-0.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md group-hover:scale-110 transition-transform">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-slate-800 group-hover:text-sky-700 transition-colors">
                  Publicar Servicio
                </div>
                <div className="text-xs text-slate-600 mt-0.5 font-medium">
                  {maxServices != null
                    ? `${servicesCount ?? 0} / ${maxServices} publicados`
                    : `${servicesCount ?? 0} publicado${(servicesCount ?? 0) !== 1 ? "s" : ""}`}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-sky-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </GuardedCreateButton>

          {/* Ver mis productos */}
          <Link
            href="/dashboard/products"
            aria-label="Ir a Mis Productos - gestionar catálogo"
            className="group relative overflow-hidden rounded-xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 p-5 text-left transition-all hover:border-violet-500 hover:shadow-lg hover:shadow-violet-100 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-md group-hover:scale-110 transition-transform">
                <LayoutGrid className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">
                  Mis Productos
                </div>
                <div className="text-xs text-slate-600 mt-0.5 font-medium">
                  Gestionar catálogo
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-violet-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Mi Plan */}
          <Link
            href="/dashboard/plan"
            aria-label="Ir a Mi Plan - gestionar suscripción"
            className="group relative overflow-hidden rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 text-left transition-all hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-100 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md group-hover:scale-110 transition-transform">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                  Mi Plan
                </div>
                <div className="text-xs text-slate-600 mt-0.5 font-medium">
                  {planLabel || "Ver suscripción"}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

        </div>
      </section>

      {/* ── MÉTRICAS ──────────────────────────────── */}
      <section className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100">
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-3 border-b bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 rounded-full bg-gradient-to-b from-violet-500 to-indigo-500" aria-hidden="true" />
                <div>
                  <CardTitle className="text-lg">Métricas de uso</CardTitle>
                  <CardDescription className="text-slate-600">Resumen del mes actual</CardDescription>
                </div>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground gap-1.5 text-xs">
                <Link href="/dashboard/plan">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Ver plan
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="text-sm space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <div className="rounded-xl border bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <UsageRadial
                  label="Productos"
                  value={productsCount ?? 0}
                  max={planVisibleLimit}
                  color="#8b5cf6"
                  layout="stacked"
                  size={148}
                  barSize={14}
                  showCenter={false}
                />
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm hover:shadow-md transition-shadow">
                <UsageRadial
                  label="Servicios"
                  value={servicesCount ?? 0}
                  max={maxServices}
                  color="#0ea5e9"
                  layout="stacked"
                  size={148}
                  barSize={14}
                  showCenter={false}
                />
              </div>
              <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-white p-4 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
                <div className="min-h-[148px] flex flex-col items-center justify-center text-center">
                  <div className="text-muted-foreground">Saldo de créditos</div>
                  <div className="mt-2 text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                    {creditsBalance}
                  </div>
                  {!isBasicPlan && !!creditsMonthly && (
                    <div className="text-xs text-muted-foreground mt-1">de {creditsMonthly} mensuales</div>
                  )}
                </div>
              </div>
              {!isBasicPlan && activatedAt && expiresAt && (
                <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm hover:shadow-md transition-shadow">
                  <CountdownUntil
                    label="Expira en"
                    startISO={activatedAt as any}
                    targetISO={expiresAt}
                    color="#10b981"
                    layout="stacked"
                    size={148}
                    barSize={14}
                    showCenter={false}
                  />
                </div>
              )}
            </div>

            {/* Alerta de visibilidad limitada */}
            {exceedsVisible && (
              <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Alerta: visibilidad limitada por tu plan</AlertTitle>
                <AlertDescription>
                  Tenés {productsCount} producto(s), pero tu plan muestra hasta {planVisibleLimit} en listados públicos.
                  <div className="mt-2">
                    <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
                      <Link href="/plans">Ver planes</Link>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ── ACCESOS DIRECTOS SECUNDARIOS ─────────── */}
      <section className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-200">
        <div className="flex items-center gap-2 mb-3">
          <UserCircle className="h-4 w-4 text-slate-500" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Mi cuenta</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard/profile">
              <UserCircle className="h-3.5 w-3.5" />
              Editar perfil
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/dashboard/services">
              <Briefcase className="h-3.5 w-3.5" />
              Mis Servicios
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/marketplace">
              <LayoutGrid className="h-3.5 w-3.5" />
              Ver marketplace
            </Link>
          </Button>
          {!isBasicPlan && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link href="/plans">
                <Crown className="h-3.5 w-3.5 text-orange-500" />
                Mejorar plan
              </Link>
            </Button>
          )}
        </div>
      </section>

    </div>
  );
}
