import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessagesInboxV2 from "@/components/messages/messages-inbox-v2";
import { getNormalizedRoleFromUser } from "@/lib/auth/role";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BuyerMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const role = getNormalizedRoleFromUser(user);
  if (role === "seller") {
    // Si es vendedor, usar su bandeja estándar
    redirect("/dashboard/messages");
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Mensajes</h1>
        <p className="text-sm text-muted-foreground sm:text-base">Bandeja de entrada</p>
      </div>
      <MessagesInboxV2 userId={user.id} />
    </div>
  );
}

