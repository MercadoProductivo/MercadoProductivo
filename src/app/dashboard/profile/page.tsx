import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ProfileFormCard from "@/components/profile/profile-form-card";
import { getNormalizedRoleFromUser } from "@/lib/auth/role";


export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }
  const isSeller = getNormalizedRoleFromUser(user) === "seller";

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4 sm:p-6 sm:space-y-6">
      {!isSeller && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 sm:p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-emerald-800">
            ¿Querés empezar a vender? Cambiá tu cuenta a vendedor y accedé a más herramientas.
          </div>
          <Button asChild className="bg-orange-500 hover:bg-orange-600">
            <Link href="/ser-vendedor">Ser vendedor</Link>
          </Button>
        </div>
      )}
      {/* Vista enfocada únicamente en el formulario de perfil */}
      <ProfileFormCard />
    </div>
  );
}

