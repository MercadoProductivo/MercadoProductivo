import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ProfileFormCard from "@/components/profile/profile-form-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Page() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Unificar: todos los usuarios autenticados editan perfil en /dashboard/profile
  redirect("/dashboard/profile");
}
