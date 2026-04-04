import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { headers } from "next/headers";

import PlanBadge from "@/components/badges/plan-badge";
import CancelSubscriptionButton from "./cancel-button";
import { normalizeRoleFromMetadata } from "@/lib/auth/role";
import { PlanSelector } from "@/components/billing/plan-selector";
import { sortPlans } from "@/lib/pricing";
import type { PlanRow } from "@/lib/pricing";
import {
  Package,
  Briefcase,
  Coins,
  ImageIcon,
  AlertCircle,
  CalendarDays,
  RefreshCw,
  Clock,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function getParam(v: string | string[] | undefined) {
  return typeof v === "string" ? v : Array.isArray(v) ? v[0] : undefined;
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "—";
  }
}

/** Barra de progreso simple para métricas */
function UsageBar({ used, max, label, icon: Icon }: {
  used: number;
  max: number | null;
  label: string;
  icon: React.ElementType;
}) {
  const pct = max != null && max > 0 ? Math.min(100, (used / max) * 100) : null;
  const isHigh = pct != null && pct >= 80;
  const isFull = pct != null && pct >= 100;

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </div>
        <span className="text-sm font-semibold tabular-nums">
          {used}
          {max != null ? `/${max}` : ""}
        </span>
      </div>
      {pct != null && (
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isFull
                ? "bg-red-500"
                : isHigh
                ? "bg-orange-400"
                : "bg-emerald-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {max == null && (
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-full bg-emerald-400 rounded-full" />
        </div>
      )}
    </div>
  );
}

/** Tarjeta de dato simple (sin barra) */
function InfoCard({ label, value, icon: Icon }: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
      <div className="mt-0.5 rounded-md bg-muted p-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}

/** Label amigable del plan */
const PLAN_LABEL_MAP: Record<string, string> = {
  free: "Básico",
  basic: "Básico",
  gratis: "Básico",
  plus: "Plus",
  enterprise: "Plus",
  premium: "Plus",
  pro: "Plus",
  deluxe: "Deluxe",
  diamond: "Deluxe",
};

function friendlyPlanLabel(code: string | null | undefined, fallback?: string | null) {
  const lc = (code || "").toLowerCase();
  return PLAN_LABEL_MAP[lc] || fallback || code || "Sin plan";
}

export default async function PlanPage({ searchParams }: Props) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const intervalRaw = getParam(sp?.interval);
  const interval = intervalRaw === "yearly" ? "yearly" : "monthly";
  const hasInterval = intervalRaw === "yearly" || intervalRaw === "monthly";

  // Perfil + plan del usuario
  let { data: profile } = await supabase
    .from("profiles")
    .select("plan_code, role_code, updated_at, plan_activated_at, plan_renews_at, plan_pending_code, plan_pending_effective_at, mp_subscription_status, mp_preapproval_id, credits_balance")
    .eq("id", user.id)
    .single();

  let didApplyPending = false;

  const cancelParam = getParam(sp?.cancel);
  const showCancelSuccess = cancelParam === "1";
  const mpParam = getParam(sp?.mp);
  const showMpWarning = showCancelSuccess && mpParam === "0";

  if (profile?.plan_pending_code && profile?.plan_pending_effective_at) {
    const now = new Date();
    const eff = new Date(profile.plan_pending_effective_at);
    if (!Number.isNaN(eff.getTime()) && now >= eff) {
      const hasPreapproval = !!(profile as any)?.mp_preapproval_id;
      const mpStatus = (profile as any)?.mp_subscription_status || null;
      const canApply = !hasPreapproval || mpStatus === "authorized";
      if (canApply) {
        const newActivatedAt = new Date();
        const newRenewsAt = new Date(newActivatedAt);
        newRenewsAt.setMonth(newRenewsAt.getMonth() + 1);
        await supabase
          .from("profiles")
          .update({
            plan_code: profile.plan_pending_code,
            plan_pending_code: null,
            plan_pending_effective_at: null,
            plan_activated_at: newActivatedAt.toISOString(),
            plan_renews_at: newRenewsAt.toISOString(),
          })
          .eq("id", user.id);
        didApplyPending = true;
        const { data: refreshed } = await supabase
          .from("profiles")
          .select("plan_code, role_code, updated_at, plan_activated_at, plan_renews_at, plan_pending_code, plan_pending_effective_at, mp_subscription_status, mp_preapproval_id")
          .eq("id", user.id)
          .single();
        (profile as any) = refreshed as any;
      }
    }
  }

  if (didApplyPending) {
    try {
      const h2 = await headers();
      await fetch("/api/billing/mp/post-apply", {
        method: "POST",
        headers: { cookie: h2.get("cookie") ?? "" },
        cache: "no-store",
      });
    } catch { }
  }

  const planCode = (profile?.plan_code || "").toString();

  const { data: plan } = planCode
    ? await supabase.from("plans").select("code, name, max_products, max_services, max_images_per_product, max_images_per_service, credits_monthly").eq("code", planCode).single()
    : { data: null } as const;

  const { count: productsCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: servicesCount } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("published", true);

  const now = new Date();
  const periodYM = now.getFullYear() * 100 + (now.getMonth() + 1);
  const { data: usage } = await supabase.from("usage_counters" as any).select("credits_used").eq("user_id", user.id).eq("period_ym", periodYM).maybeSingle();
  const creditsUsed = (usage as any)?.credits_used ?? 0;
  const creditsBalance = (profile as any)?.credits_balance ?? 0;

  const maxProducts = plan?.max_products ?? null;
  const maxServices = (plan as any)?.max_services ?? null;
  const creditsMonthly = plan?.credits_monthly ?? 0;
  const maxImagesPerProduct = plan?.max_images_per_product ?? null;
  const maxImagesPerService = (plan as any)?.max_images_per_service ?? null;

  const activatedAt = planCode ? ((profile as any)?.plan_activated_at ?? (profile as any)?.updated_at ?? null) : null;
  const renewsAt = (profile as any)?.plan_renews_at ?? null;

  const planLabel = friendlyPlanLabel(planCode, plan?.name);

  const lc = (planCode || plan?.code || "").toLowerCase();
  const isBasicPlan = lc === "free" || lc === "basic" || planLabel.toLowerCase().includes("básico");
  const isPlusOrDeluxe = ["plus", "enterprise", "deluxe"].includes(lc) || /(plus|deluxe)/i.test(planLabel);
  const mpStatus = (profile as any)?.mp_subscription_status ?? null as string | null;
  const hasPending = Boolean(profile?.plan_pending_code);

  const roleMeta = (user.user_metadata?.role_code || "").toString();
  const roleFromProfile = (profile?.role_code || "").toString();
  const roleRaw = roleMeta || roleFromProfile;
  const isSeller = normalizeRoleFromMetadata({ role_code: roleRaw }) === "seller" || !!planCode || (productsCount ?? 0) > 0;

  // Cargar planes disponibles
  let plans: PlanRow[] = [];
  try {
    const { data: plansData } = await supabase
      .from("plans")
      .select("code, name, max_products, max_images_per_product, credits_monthly, price_monthly_cents, price_yearly_cents, currency")
      .order("code", { ascending: true });
    const raw = Array.isArray(plansData) ? plansData : [];
    plans = sortPlans(raw as PlanRow[]);
  } catch { }

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-5 sm:p-6 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mi Plan</h1>
        <p className="text-sm text-muted-foreground">Gestiona tu suscripción y uso</p>
      </div>

      {/* Alertas de estado (cancelación exitosa, advertencia MP) */}
      {showCancelSuccess && (
        <Alert className="border-green-200 bg-green-50 text-green-800">
          <AlertTitle>Cancelación programada</AlertTitle>
          <AlertDescription>
            Tu suscripción fue cancelada correctamente. Tu plan cambiará a{" "}
            <span className="font-medium">Básico</span> el{" "}
            {formatDate((profile as any)?.plan_pending_effective_at)}. Hasta entonces,
            mantendrás los beneficios del plan actual.
          </AlertDescription>
        </Alert>
      )}

      {showMpWarning && (
        <Alert className="border-yellow-200 bg-yellow-50 text-yellow-900">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atención: verificación con Mercado Pago</AlertTitle>
          <AlertDescription>
            No pudimos confirmar la cancelación en Mercado Pago. Verificá tu método de pago o volvé a intentar más tarde. Si el problema persiste,{" "}
            <Link href="/contacto" className="underline font-medium">contactanos</Link>.
          </AlertDescription>
        </Alert>
      )}

      {/* ── Sección 1: Plan actual ─────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">Plan actual</CardTitle>
              <CardDescription>Uso de recursos de tu cuenta</CardDescription>
            </div>
            <PlanBadge planLabel={planLabel} planCode={planCode} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Métricas con barras */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <UsageBar
              used={productsCount ?? 0}
              max={maxProducts}
              label="Productos"
              icon={Package}
            />
            <UsageBar
              used={servicesCount ?? 0}
              max={maxServices}
              label="Servicios"
              icon={Briefcase}
            />
            {!isBasicPlan && creditsMonthly > 0 && (
              <>
                <UsageBar
                  used={creditsUsed}
                  max={creditsMonthly}
                  label="Créditos usados (este mes)"
                  icon={Coins}
                />
                <div className="rounded-xl border bg-card p-4 flex items-start gap-3">
                  <div className="mt-0.5 rounded-md bg-muted p-1.5">
                    <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Saldo de créditos</div>
                    <div className="text-sm font-semibold">{creditsBalance}</div>
                  </div>
                </div>
              </>
            )}
            {isBasicPlan && (
              <div className="sm:col-span-2 rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
                Los créditos y funciones avanzadas están disponibles en planes Plus y Deluxe.
              </div>
            )}
          </div>

          {/* Datos del ciclo de facturación */}
          {isPlusOrDeluxe && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
              {activatedAt && (
                <InfoCard
                  label="Activo desde"
                  value={formatDate(activatedAt)}
                  icon={CalendarDays}
                />
              )}
              {renewsAt && (
                <InfoCard
                  label="Próxima renovación"
                  value={formatDate(renewsAt)}
                  icon={RefreshCw}
                />
              )}
            </div>
          )}

          {/* Cambio programado */}
          {profile?.plan_pending_code && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
              <Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-900">Cambio de plan programado</p>
                <p className="text-amber-800 mt-0.5">
                  Tu plan pasará a{" "}
                  <span className="font-semibold">
                    {friendlyPlanLabel(profile.plan_pending_code)}
                  </span>{" "}
                  el {formatDate(profile.plan_pending_effective_at)}.
                  Hasta entonces seguirás con los beneficios actuales.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Sección 2: Cambiar plan ────────────────────────── */}
      {isSeller && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Cambiar plan</CardTitle>
            <CardDescription>
              El cambio se programará para el próximo ciclo de facturación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PlanSelector
              plans={plans}
              currentPlanCode={planCode}
              hasPending={hasPending}
            />
          </CardContent>
        </Card>
      )}

      {/* ── Sección 3: Zona peligrosa ──────────────────────── */}
      {isPlusOrDeluxe && mpStatus !== "cancelled" && (
        <Card className="border-red-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-700">Zona peligrosa</CardTitle>
            <CardDescription>
              Al cancelar tu suscripción, tu plan pasará a{" "}
              <span className="font-medium">Básico (gratuito)</span>{" "}
              {renewsAt
                ? `el ${formatDate(renewsAt)}`
                : "al cierre de tu ciclo actual"}.{" "}
              Hasta entonces conservarás todos los beneficios actuales.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CancelSubscriptionButton
              disabled={hasPending}
              renewsAt={renewsAt}
            />
            {hasPending && (
              <p className="mt-2 text-xs text-muted-foreground">
                No podés cancelar mientras hay un cambio de plan pendiente.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
