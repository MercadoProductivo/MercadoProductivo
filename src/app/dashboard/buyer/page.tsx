import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNormalizedRoleFromUser } from "@/lib/auth/role";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BuyerHomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");
  const role = getNormalizedRoleFromUser(user);
  if (role === "seller") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mi cuenta (Comprador)</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Accesos rápidos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Mensajes</CardTitle>
            <CardDescription>Conversaciones con vendedores</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/buyer/messages">Abrir bandeja</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Perfil</CardTitle>
            <CardDescription>Actualiza tu información</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/buyer/profile">Editar perfil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>¿Querés empezar a vender?</CardTitle>
          <CardDescription>Cambia tu cuenta a vendedor y publica productos y servicios.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
            <Link href="/planes">Ver planes</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

