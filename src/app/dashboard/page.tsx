import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { UsageRadial, CountdownUntil } from "@/components/dashboard/kpi-charts";
import PlanBadge from "@/components/badges/plan-badge";
import DashboardHeaderBadges from "@/components/badges/dashboard-header-badges";
import { getNormalizedRoleFromUser } from "@/lib/auth/role";
import { normalizePlanCode, getPlanLabel } from "@/lib/plans";


export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Unificado: no redirigir por rol; compradores también pueden ver el dashboard

  // Nombre para saludo
  const firstNameFromMeta = (user.user_metadata?.first_name || user.user_metadata?.firstName || user.user_metadata?.full_name || "").toString().split(" ")[0];
  const emailVerified = Boolean(user.email_confirmed_at);
  const roleNormalized = getNormalizedRoleFromUser(user);
  // Si es comprador, redirigir a la vista de Perfil por defecto
  if (roleNormalized === "buyer") {
    redirect("/dashboard/profile");
  }
  // Plan: preferir DB (profiles.plan_code); metadata como fallback
  const metaPlan = (user.user_metadata?.plan || user.user_metadata?.plan_code || "").toString();
  let planRaw = "";

  // Traer perfil y determinar campos requeridos para publicar
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name, full_name, dni_cuit, company, address, city, province, postal_code, plan_code, updated_at, credits_balance")
    .eq("id", user.id)
    .single();

  planRaw = (profile?.plan_code || "").toString() || metaPlan;
  // Normalizar código de plan usando utilidad centralizada
  const planCodeNormalized = normalizePlanCode(planRaw);
  let planLabel = getPlanLabel(planRaw);
  if (!planRaw && roleNormalized === "seller") {
    // Fallback visual: si es vendedor pero aún no tiene plan_code, mostrar Gratis
    planLabel = "Gratis";
  }

  const p_first = (profile?.first_name ?? user.user_metadata?.first_name ?? "").toString();
  const p_last = (profile?.last_name ?? user.user_metadata?.last_name ?? "").toString();
  const full_name = (profile?.full_name ?? `${p_first} ${p_last}`).toString().trim();
  const p_email = (user.email ?? "").toString();
  const p_dni_cuit = (profile?.dni_cuit ?? "").toString();
  const p_company = (profile?.company ?? "").toString();
  const p_address = (profile?.address ?? "").toString();
  const p_city = (profile?.city ?? "").toString();
  const p_province = (profile?.province ?? "").toString();
  const p_cp = (profile?.postal_code ?? "").toString();

  const firstName = p_first || firstNameFromMeta || user.email?.split("@")[0] || "Usuario";

  const missingLabels: string[] = [];
  const notEmpty = (s: string) => (s ?? "").toString().trim().length > 0;
  if (!notEmpty(p_first)) missingLabels.push("Nombre");
  if (!notEmpty(p_last)) missingLabels.push("Apellido");
  if (!notEmpty(p_email)) missingLabels.push("Email");
  if (!notEmpty(p_dni_cuit)) missingLabels.push("DNI o CUIT");
  if (!notEmpty(p_address)) missingLabels.push("Dirección");
  if (!notEmpty(p_city)) missingLabels.push("Localidad");
  if (!notEmpty(p_province)) missingLabels.push("Provincia");
  if (!notEmpty(p_cp)) missingLabels.push("Código Postal");

  // Datos adicionales para tarjetas de métricas
  const planCode = (profile?.plan_code || metaPlan || "").toString();
  const { count: productsCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: plan } = planCode
    ? await supabase
      .from("plans")
      .select("code, name, max_products, max_services, credits_monthly")
      .eq("code", planCode)
      .single()
    : ({ data: null } as const);

  // Mostrar preferentemente el nombre dinámico del plan desde la tabla `plans`
  if (plan?.name) {
    planLabel = plan.name;
  }

  const planCodeLower = (planCode || "").toLowerCase();
  const labelLower = (planLabel || "").toLowerCase();
  const isBasicPlan = /b[áa]sico/.test(labelLower) || ["free", "basic"].includes(planCodeLower);

  const now = new Date();
  const periodYM = now.getFullYear() * 100 + (now.getMonth() + 1); // YYYYMM
  const { data: usage } = await supabase
    .from("usage_counters")
    .select("credits_used")
    .eq("user_id", user.id)
    .eq("period_ym", periodYM)
    .maybeSingle();

  const creditsUsed = usage?.credits_used ?? 0;
  const creditsMonthly = plan?.credits_monthly ?? 0;
  const creditsBalance = (profile as any)?.credits_balance ?? 0;
  const maxProducts = plan?.max_products ?? null;
  const maxServices = (plan as any)?.max_services ?? null;

  // Métrica de servicios (publicados)
  const { count: servicesCount } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("published", true);

  // Límite de visibilidad pública por plan (enforcement del endpoint público)
  // Considera también el fallback por etiqueta cuando no hay plan_code pero el label muestra "Básico".
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

  // (Gráfico de actividad removido)

  // Expiración estimada: 1 mes desde activación; fallback a updated_at cuando haya plan
  const activatedAt = planCode ? (profile as any)?.updated_at ?? null : null;
  let expiresAt: string | null = null;
  if (activatedAt) {
    const d = new Date(activatedAt);
    d.setMonth(d.getMonth() + 1);
    expiresAt = d.toISOString();
  }

  const fmt = (d?: string | null) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleDateString("es-AR", { year: "numeric", month: "short", day: "2-digit" });
    } catch {
      return "—";
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-4 space-y-6 sm:p-6 sm:space-y-8">
      {/* Header mejorado */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 shadow-xl animate-in fade-in-0 slide-in-from-top-4 duration-500">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500 rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div className="text-white">
            <p className="text-sm text-slate-400 mb-1">
              {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Panel de Control</h1>
            <p className="text-slate-300 mt-1">Bienvenido, {firstName} 👋</p>
          </div>
          <DashboardHeaderBadges
            emailVerified={emailVerified}
            planLabel={planLabel}
            planCode={planCode}
          />
        </div>
      </div>

      <section className="space-y-6">

        {/* Card Métricas */}
        <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow animate-in fade-in-0 slide-in-from-bottom-4 duration-500 delay-100">
          <CardHeader className="pb-3 border-b bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-2">
              <div className="h-8 w-1 rounded-full bg-gradient-to-b from-violet-500 to-indigo-500" />
              <div>
                <CardTitle className="text-lg">Métricas de uso</CardTitle>
                <CardDescription>Resumen del mes actual</CardDescription>
              </div>
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
                  <div className="mt-2 text-4xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">{creditsBalance}</div>
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
            {exceedsVisible && (
              <Alert className="border-amber-300 bg-amber-50 text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Alerta: visibilidad limitada por tu plan</AlertTitle>
                <AlertDescription>
                  Actualmente tienes {productsCount} producto(s), pero tu plan permite mostrar hasta {planVisibleLimit} en listados públicos.
                  Para aumentar tu visibilidad, considera actualizar tu plan.
                  <div className="mt-2">
                    <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-900 hover:bg-amber-100">
                      <Link href="/planes">Ver planes</Link>
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            {/* Gráfico de líneas removido */}
          </CardContent>
        </Card>



        {/* Tarjeta de "Información requerida para publicar" eliminada: ahora se maneja con modal y redirección a /dashboard/profile */}

        {/* El formulario de perfil se movió a /dashboard/profile para mantener el dashboard limpio */}
      </section>
    </div>
  );
}

