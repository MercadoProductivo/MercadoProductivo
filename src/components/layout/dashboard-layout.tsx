"use client";

import React from "react";
import DashboardSidebar from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children, initialIsSeller }: { children: React.ReactNode; initialIsSeller?: boolean }) {
  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar initialIsSeller={initialIsSeller} />
      <main className="flex-1 lg:ml-0">
        {/* Espaciado superior para el botón hamburguesa en móvil */}
        <div className="pt-16 lg:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
