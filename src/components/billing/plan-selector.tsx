"use client";

import { useState } from "react";
import { Check, ArrowUp, ArrowDown, Sparkles, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import { computePrice, formatCurrency, isFreePlan, isDeluxePlan, getPlanTier } from "@/lib/pricing";
import type { PlanRow } from "@/lib/pricing";
import Link from "next/link";

/** Mapa de tiers a índice de ordenamiento (para comparar upgrades/downgrades) */
const TIER_ORDER: Record<string, number> = {
  gratis: 0,
  plus: 1,
  deluxe: 2,
  other: 1,
};

const TIER_LABEL_MAP: Record<string, string> = {
  free: "Básico",
  basic: "Básico",
  gratis: "Básico",
  basico: "Básico",
  plus: "Plus",
  enterprise: "Plus",
  premium: "Plus",
  pro: "Plus",
  deluxe: "Deluxe",
  diamond: "Deluxe",
};

function getFriendlyName(p: PlanRow): string {
  const code = (p.code || "").toLowerCase();
  return p.name || TIER_LABEL_MAP[code] || p.code;
}

type PlanSelectorProps = {
  plans: PlanRow[];
  currentPlanCode: string;
  hasPending: boolean;
};

export function PlanSelector({ plans, currentPlanCode, hasPending }: PlanSelectorProps) {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");

  const currentCodeLower = currentPlanCode.toLowerCase();
  const currentPlan = plans.find((p) => p.code.toLowerCase() === currentCodeLower);
  const currentTier = currentPlan ? getPlanTier(currentPlan) : null;
  const currentTierOrder = currentTier ? (TIER_ORDER[currentTier] ?? 0) : 0;

  return (
    <div className="space-y-5">
      {/* Toggle mensual / anual */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setInterval("monthly")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
            interval === "monthly"
              ? "bg-foreground text-background shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Mensual
        </button>
        <button
          type="button"
          onClick={() => setInterval("yearly")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2",
            interval === "yearly"
              ? "bg-foreground text-background shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Anual
          <span
            className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-colors",
              interval === "yearly"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-emerald-100 text-emerald-700"
            )}
          >
            17% OFF
          </span>
        </button>
      </div>

      {/* Grid de planes */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const code = (p.code || "").toLowerCase();
          const isCurrent = currentCodeLower === code;
          const isFree = isFreePlan(p);
          const isPopular = isDeluxePlan(p);
          const planTier = getPlanTier(p);
          const tierOrder = TIER_ORDER[planTier] ?? 0;
          const isUpgrade = !isCurrent && tierOrder > currentTierOrder;
          const isDowngrade = !isCurrent && tierOrder < currentTierOrder;
          const label = getFriendlyName(p);

          const priceResult = computePrice(p);
          const monthlyPrice = priceResult.monthly;
          const yearlyPrice = priceResult.yearly;
          const currency = priceResult.currency;

          // Precio a mostrar según intervalo seleccionado
          const displayPrice =
            interval === "yearly"
              ? yearlyPrice != null && yearlyPrice > 0
                ? yearlyPrice / 12
                : null
              : monthlyPrice;

          const displayPriceFmt = isFree
            ? "Gratis"
            : displayPrice != null
            ? formatCurrency(displayPrice, currency)
            : "—";

          const annualTotalFmt =
            !isFree && yearlyPrice
              ? formatCurrency(yearlyPrice, currency)
              : null;

          return (
            <div
              key={p.code}
              className={cn(
                "relative flex flex-col gap-3 rounded-xl border p-4 transition-all",
                isCurrent
                  ? "border-orange-400 bg-orange-50/60 dark:bg-orange-950/20 ring-2 ring-orange-400/30"
                  : isPopular && !isCurrent
                  ? "border-orange-200 hover:border-orange-400 hover:shadow-md"
                  : "border-border hover:border-muted-foreground/40 hover:shadow-sm"
              )}
            >
              {/* Badge superior */}
              {isCurrent && (
                <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow">
                  <Check className="h-3 w-3" />
                  Tu plan actual
                </span>
              )}
              {isPopular && !isCurrent && (
                <span className="absolute -top-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow">
                  <Sparkles className="h-3 w-3" />
                  Más popular
                </span>
              )}

              {/* Encabezado plan */}
              <div className="flex items-start justify-between pt-1">
                <div>
                  <div className="flex items-center gap-2">
                    {isPopular && (
                      <Crown className="h-4 w-4 text-orange-500 shrink-0" />
                    )}
                    <span className="font-semibold text-base">{label}</span>
                  </div>
                </div>

                {/* Indicator de upgrade/downgrade */}
                {isUpgrade && (
                  <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-200 bg-emerald-50 text-[11px]">
                    <ArrowUp className="h-2.5 w-2.5" />
                    Upgrade
                  </Badge>
                )}
                {isDowngrade && (
                  <Badge variant="outline" className="gap-1 text-slate-500 border-slate-200 text-[11px]">
                    <ArrowDown className="h-2.5 w-2.5" />
                    Downgrade
                  </Badge>
                )}
              </div>

              {/* Precio */}
              <div className="space-y-0.5">
                <div className="flex items-baseline gap-1">
                  <span
                    className={cn(
                      "text-2xl font-extrabold tracking-tight",
                      isFree ? "text-emerald-600" : "text-foreground"
                    )}
                  >
                    {displayPriceFmt}
                  </span>
                  {!isFree && displayPrice != null && (
                    <span className="text-sm text-muted-foreground">/mes</span>
                  )}
                </div>
                {interval === "yearly" && annualTotalFmt && (
                  <p className="text-xs text-muted-foreground">
                    Facturado {annualTotalFmt}/año
                  </p>
                )}
                {interval === "monthly" && !isFree && yearlyPrice && yearlyPrice > 0 && (
                  <p className="text-xs text-muted-foreground">
                    o ahorrá 17% pagando anual
                  </p>
                )}
              </div>

              {/* Features clave */}
              <ul className="space-y-1 text-xs text-muted-foreground flex-1">
                <li>
                  {p.max_products
                    ? `Hasta ${p.max_products} productos`
                    : "Productos ilimitados"}
                </li>
                <li>
                  {p.max_images_per_product
                    ? `${p.max_images_per_product} imágenes por producto`
                    : "Imágenes por producto: —"}
                </li>
                <li>
                  {(p.credits_monthly ?? 0) > 0
                    ? `${p.credits_monthly} créditos/mes`
                    : "Sin créditos"}
                </li>
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <Button size="sm" variant="outline" disabled className="w-full">
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Plan actual
                </Button>
              ) : hasPending ? (
                <Button size="sm" variant="secondary" disabled className="w-full text-xs">
                  Cambio pendiente en curso
                </Button>
              ) : (
                <SubscribeButton
                  code={p.code}
                  interval={interval}
                  className={cn(
                    "w-full",
                    isUpgrade && isPopular
                      ? "bg-orange-500 hover:bg-orange-600 text-white"
                      : ""
                  )}
                  variant={isUpgrade && isPopular ? "default" : "outline"}
                  size="sm"
                >
                  {isFree
                    ? "Cambiar a Básico"
                    : isUpgrade
                    ? `Cambiar a ${label}`
                    : `Cambiar a ${label}`}
                </SubscribeButton>
              )}
            </div>
          );
        })}

        {plans.length === 0 && (
          <p className="sm:col-span-2 lg:col-span-3 text-sm text-muted-foreground">
            No hay planes configurados.
          </p>
        )}
      </div>

      {/* Link a página de comparativa completa */}
      <div className="flex justify-end">
        <Button asChild variant="link" size="sm" className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs">
          <Link href="/plans">
            Ver comparativa completa de planes →
          </Link>
        </Button>
      </div>
    </div>
  );
}
