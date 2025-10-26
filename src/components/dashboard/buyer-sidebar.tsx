"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getDashboardNav } from "@/config/navigation";

export default function BuyerSidebar() {
  const pathname = usePathname();
  const items = getDashboardNav(false);

  return (
    <aside className="hidden lg:flex lg:flex-col border-r bg-card/50 w-64 h-full">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-center p-4 border-b">
          <h2 className="text-lg font-semibold">Mi Cuenta</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <nav className="grid gap-1 p-3">
            {items.map(({ href, label, icon: Icon }) => {
              const active = pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                    active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon size={16} className="shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="p-3 border-t">
          <Button asChild className="w-full">
            <Link href="/ser-vendedor">Ser vendedor</Link>
          </Button>
        </div>
      </div>
    </aside>
  );
}
