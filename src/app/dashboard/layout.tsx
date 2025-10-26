import { ReactNode } from "react";
import DashboardSidebar from "@/components/dashboard/sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { normalizeRoleFromMetadata } from "@/lib/auth/role";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Guardia adicional del lado del servidor (además del middleware)
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar initialIsSeller={normalizeRoleFromMetadata(user?.user_metadata || {}) === "seller"} />
      <main className="flex-1 lg:ml-0">
        {/* Espaciado superior suave en móvil (AppShell ya compensa el header) */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
