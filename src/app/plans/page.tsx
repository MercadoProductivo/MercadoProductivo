import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { createClient } from "@/lib/supabase/server";

import { PricingSwitch } from "@/components/billing/pricing-switch";
import { Check, X, Image as ImageIcon, Package as PackageIcon, Coins, Sparkles, MessageCircle, Zap, Shield, Crown } from "lucide-react";
import { SubscribeButton } from "@/components/billing/subscribe-button";
import {
  computePrice,
  formatCurrency,
  isFreePlan,
  isDeluxePlan,
  getPlanTier,
  sortPlans,
  type PlanRow
} from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Planes de Suscripción | Mercado Productivo",
  description: "Planes flexibles para emprendedores, PyMEs y empresas. Elige el plan perfecto para tu negocio.",
};

export const revalidate = 3600; // ISR: 1 hora

// ... imports

export default async function PlanesPage({ searchParams }: { searchParams: Promise<{ interval?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const params = await searchParams;
  const interval = params?.interval === "yearly" ? "yearly" : "monthly";

  let userPlanCodeLower = "";
  if (user) {
    // ... rest of user plan logic
    const metaPlan = (user.user_metadata?.plan || user.user_metadata?.plan_code || "").toString();
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_code")
      .eq("id", user.id)
      .maybeSingle();
    userPlanCodeLower = ((profile?.plan_code || metaPlan || "") as string).toLowerCase();
  }

  const freeCodes = new Set(["gratis", "free", "basic"]);
  const plusCodes = new Set(["plus", "enterprise", "premium", "pro"]);
  const deluxeCodes = new Set(["deluxe", "diamond"]);
  const currentTier = userPlanCodeLower
    ? freeCodes.has(userPlanCodeLower) ? "gratis"
      : plusCodes.has(userPlanCodeLower) ? "plus"
        : deluxeCodes.has(userPlanCodeLower) ? "deluxe" : "other"
    : "";

  let plans: PlanRow[] = [];
  let endpointError: string | null = null;

  try {
    const columnsFull = "code, name, max_products, max_images_per_product, credits_monthly, can_feature, feature_cost, price_monthly_cents, price_yearly_cents, currency";
    const { data, error } = await supabase
      .from("plans")
      .select(columnsFull)
      .order("code", { ascending: true });

    if (error) {
      const columnsBase = "code, name, max_products, max_images_per_product, credits_monthly";
      const { data: dataBase, error: errorBase } = await supabase
        .from("plans")
        .select(columnsBase)
        .order("code", { ascending: true });


      if (!errorBase && Array.isArray(dataBase)) {
        plans = dataBase.map((r: any) => ({
          ...r,
          can_feature: null,
          feature_cost: null,
          price_monthly_cents: null,
          price_yearly_cents: null,
          currency: null,
        }));
      } else {
        endpointError = (errorBase || error)?.message || "No se pudieron cargar los planes";
      }
    } else {
      plans = Array.isArray(data) ? data : [];
    }
  } catch (e: any) {
    endpointError = e?.message || "Fallo de red";
  }

  // Reorder plans
  try {
    plans = sortPlans(plans);
  } catch { }



  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 sm:py-20 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/20 backdrop-blur-sm text-orange-400 text-sm font-medium px-4 py-2 rounded-full mb-6">
            <Crown className="h-4 w-4" />
            Planes flexibles para cada negocio
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Elige el plan perfecto para ti
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
            Desde emprendedores hasta grandes empresas, tenemos la solución perfecta para tus necesidades.
          </p>

          {/* Toggle Mensual/Anual */}
          <PricingSwitch interval={interval as "monthly" | "yearly"} />
        </div>
      </section>

      {/* Plans Grid */}
      <section className="relative -mt-8 pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((p, idx) => {
              const code = (p.code || "").toLowerCase();
              const label = p.name || p.code || "Plan";
              const maxProducts = p.max_products ?? null;
              const maxImages = p.max_images_per_product ?? null;
              const credits = p.credits_monthly ?? 0;
              const canFeature = Boolean(p.can_feature ?? true);
              const featureCost = typeof p.feature_cost === "number" ? p.feature_cost : null;

              // Precios usando utilidad centralizada
              const priceResult = computePrice(p);
              const monthly = priceResult.monthly;
              const yearly = priceResult.yearly;
              const currency = priceResult.currency;
              const savings = priceResult.savings;

              // Formateo
              const monthlyFmt = monthly != null && monthly > 0 ? formatCurrency(monthly, currency) : null;
              const yearlyFmt = yearly != null && yearly > 0 ? formatCurrency(yearly, currency) : null;
              const savingsFmt = savings > 0 ? formatCurrency(savings, currency) : null;

              const reducedMonthly = yearly != null && yearly > 0 ? yearly / 12 : null;
              const reducedMonthlyFmt = reducedMonthly ? formatCurrency(reducedMonthly, currency) : null;

              const isPopular = isDeluxePlan(p);
              const planTier = getPlanTier(p);
              const isCurrentPlan = Boolean(user && currentTier && planTier !== "other" && planTier === currentTier);
              const isFree = isFreePlan(p);

              return (
                <Card
                  key={p.code}
                  className={`relative flex h-full flex-col overflow-hidden transition-all duration-300 ${isPopular
                    ? "ring-2 ring-orange-500 shadow-xl shadow-orange-500/10 scale-[1.02] z-10"
                    : interval === "yearly" ? "ring-1 ring-green-500/30 shadow-lg" : "hover:shadow-lg border-0 shadow-md"
                    }`}
                >
                  {isPopular && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
                  )}
                  {isPopular && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-orange-500 text-white px-3 py-1">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Más Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold">{label}</CardTitle>
                    <CardDescription className="capitalize text-muted-foreground">{isFree ? "Comienza gratis" : "Para profesionales"}</CardDescription>
                  </CardHeader>

                  <CardContent className="grow space-y-6">
                    {/* Price */}
                    <div className="min-h-[120px] pt-2">
                      {interval === "yearly" ? (
                        <div className="space-y-3">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-5xl tracking-tight font-extrabold text-foreground">
                              {isFree ? (
                                <span className="text-emerald-600 dark:text-emerald-500">Gratis</span>
                              ) : reducedMonthlyFmt ? (
                                <span className="text-foreground">{reducedMonthlyFmt}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </span>
                            {!isFree && reducedMonthlyFmt && (
                              <span className="text-muted-foreground font-medium text-lg">/mes</span>
                            )}
                          </div>

                          {!isFree && yearlyFmt && (
                            <div className="flex flex-col gap-2">
                              <p className="text-sm text-muted-foreground font-medium">
                                Facturado {yearlyFmt} anual
                              </p>
                              {savingsFmt && (
                                <div>
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-500/20">
                                    Ahorras {savingsFmt}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-5xl tracking-tight font-extrabold text-foreground">
                              {isFree ? (
                                <span className="text-emerald-600 dark:text-emerald-500">Gratis</span>
                              ) : monthlyFmt ? (
                                <span className="text-foreground">{monthlyFmt}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </span>
                            {!isFree && monthlyFmt && (
                              <span className="text-muted-foreground font-medium text-lg">/mes</span>
                            )}
                          </div>
                          {!isFree && yearly && yearly > 0 && (
                            <p className="text-sm text-muted-foreground">
                              o ahorra 17% pagando anual
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-3">
                      <FeatureItem icon={PackageIcon} included>
                        {maxProducts ? `${maxProducts} productos máximo` : "Productos ilimitados"}
                      </FeatureItem>
                      <FeatureItem icon={ImageIcon} included>
                        {maxImages ?? "—"} imágenes por producto
                      </FeatureItem>
                      <FeatureItem icon={Coins} included={credits > 0}>
                        {credits > 0 ? `${credits} créditos mensuales` : "Sin créditos"}
                      </FeatureItem>
                      <FeatureItem icon={Sparkles} included={canFeature}>
                        {canFeature ? "Destacar productos" : "No puede destacar"}
                      </FeatureItem>
                      <FeatureItem icon={MessageCircle} included>
                        Chat integrado
                      </FeatureItem>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-4">
                    {user ? (
                      isCurrentPlan ? (
                        <Button className="w-full" variant="outline" disabled>
                          <Check className="h-4 w-4 mr-2" />
                          Plan actual
                        </Button>
                      ) : (
                        <SubscribeButton
                          code={p.code}
                          interval={interval as "monthly" | "yearly"}
                          className={`w-full ${isPopular ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
                          variant={isPopular ? "default" : "outline"}
                        >
                          Cambiar a {label}
                        </SubscribeButton>
                      )
                    ) : (
                      <SubscribeButton
                        code={p.code}
                        interval={interval as "monthly" | "yearly"}
                        className={`w-full ${isPopular ? "bg-orange-500 hover:bg-orange-600 text-white" : ""}`}
                        variant={isPopular ? "default" : "outline"}
                      >
                        {isFree ? "Comenzar gratis" : `Elegir ${label}`}
                      </SubscribeButton>
                    )}
                  </CardFooter>
                </Card>
              );
            })}

            {(!plans || plans.length === 0) && (
              <Card className="md:col-span-2 lg:col-span-3 border-0 shadow-md">
                <CardHeader>
                  <CardTitle>Planes no disponibles</CardTitle>
                  <CardDescription>No pudimos cargar los planes. Intenta nuevamente.</CardDescription>
                </CardHeader>
                {endpointError && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Error: {endpointError}</p>
                  </CardContent>
                )}
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Todos los planes incluyen</h2>
            <p className="mt-2 text-muted-foreground">Funcionalidades premium para hacer crecer tu negocio</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ServiceCard
              icon={PackageIcon}
              title="Gestión Simple"
              description="Sube y gestiona productos con facilidad"
              color="orange"
            />
            <ServiceCard
              icon={Sparkles}
              title="Destacados"
              description="Haz que tus productos se vean primero"
              color="purple"
            />
            <ServiceCard
              icon={MessageCircle}
              title="Chat en Vivo"
              description="Conecta con clientes en tiempo real"
              color="green"
            />
            <ServiceCard
              icon={Shield}
              title="Seguridad"
              description="Transacciones y datos protegidos"
              color="blue"
            />
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      {plans && plans.length > 0 && (
        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Comparar planes</h2>
              <p className="mt-2 text-muted-foreground">Encuentra el plan ideal para ti</p>
            </div>

            <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-foreground">Característica</th>
                    {plans.map((p) => (
                      <th key={`h-${p.code}`} className={`px-6 py-4 text-left font-semibold ${isDeluxePlan(p) ? "text-orange-600" : "text-foreground"}`}>
                        {p.name || p.code}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <ComparisonRow label="Precio mensual" plans={plans} getValue={(p) => {
                    const { monthly, currency } = computePrice(p);
                    return monthly === 0 ? "Gratis" : monthly != null ? formatCurrency(monthly, currency) : "—";
                  }} />
                  <ComparisonRow label="Productos máximos" plans={plans} getValue={(p) =>
                    p.max_products ? String(p.max_products) : "Ilimitados"
                  } />
                  <ComparisonRow label="Imágenes por producto" plans={plans} getValue={(p) =>
                    String(p.max_images_per_product ?? "—")
                  } />
                  <ComparisonRow label="Créditos mensuales" plans={plans} getValue={(p) =>
                    String(p.credits_monthly ?? 0)
                  } />
                  <ComparisonRow label="Destacar productos" plans={plans} getValue={(p) =>
                    p.can_feature ? "✓" : "✗"
                  } isCheck />
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Preguntas Frecuentes</h2>
            <p className="mt-2 text-muted-foreground">Resolvemos tus dudas</p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="q1" className="bg-card rounded-lg border-0 shadow-sm px-4">
              <AccordionTrigger className="text-left font-medium">¿Puedo cambiar de plan en cualquier momento?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sí, puedes actualizar o degradar tu plan cuando quieras desde tu panel de control. Los cambios se aplican en tu próximo ciclo de facturación.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q2" className="bg-card rounded-lg border-0 shadow-sm px-4">
              <AccordionTrigger className="text-left font-medium">¿Qué son los créditos mensuales?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Los créditos te permiten destacar productos y aparecer en búsquedas prioritarias. Se renuevan cada mes según tu plan.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q3" className="bg-card rounded-lg border-0 shadow-sm px-4">
              <AccordionTrigger className="text-left font-medium">¿Hay descuentos por pago anual?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sí, en todos los planes pagados anualmente obtienes 2 meses gratis, equivalente a un 17% de descuento.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="q4" className="bg-card rounded-lg border-0 shadow-sm px-4">
              <AccordionTrigger className="text-left font-medium">¿Puedo cancelar mi suscripción?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Por supuesto. Puedes cancelar en cualquier momento. Mantendrás acceso hasta el final de tu período de facturación.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-8 sm:p-12 text-white">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-90" />
            <h3 className="text-2xl sm:text-3xl font-bold mb-3">¿Listo para crecer?</h3>
            <p className="text-white/90 mb-6">
              Únete a miles de emprendedores que ya venden más con Mercado Productivo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" className="bg-white text-orange-600 hover:bg-white/90">
                <Link href="/dashboard">Comenzar Ahora</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white bg-white/10 text-white hover:bg-white hover:text-orange-600">
                <Link href="/contacto">Hablar con Ventas</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper Components
function FeatureItem({ icon: Icon, included, children }: { icon: any; included: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${included ? "text-green-600" : "text-muted-foreground"}`}>
        {included ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
      </div>
      <span className={included ? "text-foreground" : "text-muted-foreground"}>{children}</span>
    </div>
  );
}

function ServiceCard({ icon: Icon, title, description, color }: { icon: any; title: string; description: string; color: string }) {
  const colorClasses: Record<string, string> = {
    orange: "bg-orange-100 text-orange-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-blue-600",
  };

  return (
    <div className="bg-card rounded-xl p-6 text-center shadow-sm border-0">
      <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center mx-auto mb-4`}>
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ComparisonRow({ label, plans, getValue, isCheck }: { label: string; plans: PlanRow[]; getValue: (p: PlanRow) => string; isCheck?: boolean }) {
  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-6 py-4 text-muted-foreground">{label}</td>
      {plans.map((p) => {
        const value = getValue(p);
        const isDeluxe = isDeluxePlan(p);
        return (
          <td key={`r-${label}-${p.code}`} className={`px-6 py-4 ${isDeluxe ? "text-orange-600 font-medium" : ""}`}>
            {isCheck ? (
              <span className={value === "✓" ? "text-green-600" : "text-muted-foreground"}>{value}</span>
            ) : (
              value
            )}
          </td>
        );
      })}
    </tr>
  );
}
