"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare } from "lucide-react";
import { useNotifications } from "@/providers/notifications-provider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { normalizeRoleFromMetadata } from "@/lib/auth/role";
import { getDashboardNav } from "@/config/navigation";


// Navegación centralizada: provista por src/config/navigation.ts

// Hook para detectar si el sidebar móvil debe estar visible
export function useMobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, setIsOpen };
}

// Componente de navegación interna
function SidebarNav({ onItemClick, isSeller }: { onItemClick?: () => void; isSeller: boolean }) {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const filtered = useMemo(() => getDashboardNav(isSeller), [isSeller]);

  return (
    <div className="px-3 py-4 sm:px-4 sm:py-6">
      <div className="px-2 pb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">Menú</p>
      </div>
      <nav className="space-y-1">
        {filtered.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(href);
          const showUnreadDot = href === "/dashboard/messages" && unreadCount > 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onItemClick}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-orange-50 text-orange-700 shadow-sm"
                  : "text-muted-foreground hover:bg-gray-100 hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon
                  size={18}
                  className={cn(
                    "shrink-0 transition-colors",
                    active ? "text-orange-600" : "text-gray-400 group-hover:text-gray-600"
                  )}
                />
                {showUnreadDot && (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500 ring-2 ring-white" />
                )}
              </div>
              <span>{label}</span>
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-500" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function DashboardSidebar({ initialIsSeller }: { initialIsSeller?: boolean }) {
  const supabase = useMemo(() => createClient(), []);
  const [isSeller, setIsSeller] = useState<boolean>(!!initialIsSeller);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data?.user) {
        const role = normalizeRoleFromMetadata(data.user.user_metadata || {});
        setIsSeller(role === "seller");
      }
    });
    return () => { mounted = false; };
  }, [supabase]);

  return (
    /* Sidebar solo para desktop - móvil usa el menú global */
    <aside className="hidden lg:flex lg:flex-col border-r bg-card/50 w-64 h-full">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center p-4 border-b">
          <h2 className="text-lg font-semibold">Panel de Control</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav isSeller={isSeller} />
        </div>
        {!isSeller && (
          <div className="p-3 border-t">
            <Button asChild className="w-full">
              <Link href="/ser-vendedor">Ser vendedor</Link>
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
