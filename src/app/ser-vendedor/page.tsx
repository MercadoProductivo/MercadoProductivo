import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle2, Minus, Rocket, ShieldCheck } from "lucide-react";
import UpgradeToSellerButton from "@/components/upgrade/upgrade-to-seller-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SerVendedorPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=/ser-vendedor");

  // Si ya es vendedor, mandamos directo al dashboard
  const roleRaw = (user.user_metadata?.role || (user as any)?.user_metadata?.user_type || "").toString();
  const role = roleRaw === "anunciante" ? "seller" : roleRaw;
  const isSeller = role === "seller";
  if (isSeller) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-8">
      {/* Hero */}
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
          <Rocket className="h-4 w-4 text-orange-500" />
          Compara y comenzá a vender
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Comprador vs Vendedor</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Descubrí las ventajas de ser vendedor: mayor visibilidad, herramientas de contacto y más oportunidades para tu negocio.
        </p>
      </section>

      {/* Comparativa */}
      <section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>Comprador</CardTitle>
              <CardDescription>Ideal para explorar y contactar vendedores</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />Buscar productos y servicios</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />Mensajes internos a vendedores</li>
                <li className="flex items-start gap-2"><Minus className="h-4 w-4 text-gray-400 mt-0.5" />No podés publicar</li>
                <li className="flex items-start gap-2"><Minus className="h-4 w-4 text-gray-400 mt-0.5" />Visibilidad de empresa limitada</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vendedor</CardTitle>
              <CardDescription>Publicá, destacá y crecé con más visibilidad</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />Publicar productos y servicios</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />Recibir y responder mensajes de compradores</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />Nombre de empresa visible en listados y perfiles</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />Opciones para destacar publicaciones</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />Métricas y límites ampliados según plan</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section>
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex flex-col items-center gap-3 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <div className="text-sm font-medium text-emerald-900">¿Listo para empezar?</div>
              <div className="text-sm text-emerald-800">Convertí tu cuenta a vendedor en un paso, cuando quieras podés volver a tus anuncios.</div>
            </div>
            <div className="flex items-center gap-2">
              <UpgradeToSellerButton className="bg-orange-500 hover:bg-orange-600">
                Cambiar a vendedor
              </UpgradeToSellerButton>
            </div>
          </CardContent>
        </Card>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4" />
          Tu cuenta seguirá protegida; podés editar tu perfil cuando quieras.
        </div>
      </section>
    </div>
  );
}
