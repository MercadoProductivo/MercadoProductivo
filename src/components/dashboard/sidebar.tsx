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
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Menú</p>
      </div>
      <nav className="grid gap-1">
        {filtered.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(href);
          const showUnreadDot = href === "/dashboard/messages" && unreadCount > 0;
          return (
            <Link
              key={href}
              href={href}
              onClick={onItemClick}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon size={16} className="shrink-0" />
                {showUnreadDot && <span className="absolute -right-1 -top-1 inline-flex h-2 w-2 rounded-full bg-red-500" />}
              </div>
              <span>{label}</span>
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
