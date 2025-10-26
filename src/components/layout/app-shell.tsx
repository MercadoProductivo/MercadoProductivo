"use client";

import React from "react";
import { usePathname } from "next/navigation";
import SiteHeader from "./site-header";
import SiteFooter from "./site-footer";
import SupabaseListener from "@/components/supabase/supabase-listener";
import ScrollToTop from "@/components/layout/scroll-to-top";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname?.startsWith("/auth");
  const isDashboard = pathname?.startsWith("/dashboard");

  // Registro de Service Worker movido a Script beforeInteractive en src/app/layout.tsx

  return (
    <div className={`flex min-h-screen w-full flex-col ${!isAuth ? 'pt-header-safe' : ''}`}>
      {/* Sincroniza la cookie de sesión de Supabase en cliente */}
      <SupabaseListener />
      {/* Forzar scroll al tope en cambios de ruta */}
      <ScrollToTop />
      {!isAuth && <SiteHeader />}
      <main key={pathname} className="flex-1 w-full">
        {children}
      </main>
      {!isAuth && <SiteFooter />}
    </div>
  );
}
