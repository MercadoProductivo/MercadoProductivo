import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getNormalizedRoleFromUser } from "@/lib/auth/role";
import ProfileFormCard from "@/components/profile/profile-form-card";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BuyerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const role = getNormalizedRoleFromUser(user);
  if (role === "seller") {
    redirect("/dashboard/profile");
  }

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4 sm:p-6 sm:space-y-6">
      <ProfileFormCard />
    </div>
  );
}

