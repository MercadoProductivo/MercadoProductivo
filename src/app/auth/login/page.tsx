import LoginForm from "@/components/auth/login-form";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Iniciar sesión | Mercado Productivo",
};

export default async function Page({ searchParams }: { searchParams?: Promise<{ verified?: string; check_email?: string; email?: string }> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    redirect("/");
  }
  const showVerified = sp?.verified === "1";
  const showCheckEmail = sp?.check_email === "1";
  const email = sp?.email;
  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-3xl font-bold tracking-tight">Iniciar sesión</CardTitle>
        <CardDescription>
          Ingresa tus credenciales para acceder a tu cuenta
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showCheckEmail && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
            Te enviamos un correo de verificación{email ? ` a ${email}` : ""}. Revisa tu bandeja y confirma tu cuenta.
          </div>
        )}
        {showVerified && (
          <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-800">
            ¡Tu correo fue verificado correctamente! Ahora puedes iniciar sesión.
          </div>
        )}
        <LoginForm />
      </CardContent>
      <CardFooter className="flex flex-col items-center justify-center gap-1 text-sm text-muted-foreground text-center">
        <div>
          ¿No tienes una cuenta? <Link className="text-primary underline-offset-4 hover:underline" href="/auth/register">Regístrate</Link>
        </div>
        <div>
          <Link className="text-primary underline-offset-4 hover:underline" href="/auth/forgot-password">¿Olvidaste tu contraseña?</Link>
        </div>
      </CardFooter>
    </Card>
  );
}

