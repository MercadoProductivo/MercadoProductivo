"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import BuyerConversationWindow from "@/components/chat/buyer-conversation-window";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BuyerChatButton({
  sellerId,
  sellerName,
  sellerAvatarUrl,
  size = "sm",
  className,
  buttonLabel = "Enviar Mensaje",
}: {
  sellerId: string;
  sellerName?: string | null;
  sellerAvatarUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
  buttonLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const [selfId, setSelfId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setSelfId(data?.user?.id || null);
      } catch {
        setSelfId(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [supabase]);

  const isSelf = selfId && String(selfId) === String(sellerId);
  const isAuthenticated = !!selfId;

  const handleClick = () => {
    if (isSelf) return;

    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    setOpen(true);
  };

  const handleAuthRedirect = (path: string) => {
    // Add return_to param to redirect back here after auth
    const params = new URLSearchParams();
    if (pathname) {
      params.set("return_to", pathname);
    }
    router.push(`${path}?${params.toString()}`);
  };

  const triggerSize = size === "sm" ? "h-8 px-2 py-1 text-xs" : "h-9 px-3 py-1.5 text-sm";

  return (
    <>
      <Button
        className={cn("inline-flex items-center gap-2", triggerSize, className)}
        onClick={handleClick}
        disabled={!!isSelf || isLoading}
        title={isSelf ? "No puedes enviarte mensajes a ti mismo" : undefined}
      >
        <Mail className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        <span>{buttonLabel}</span>
      </Button>

      {/* Modal de Login Requerido */}
      <AlertDialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <AlertDialogContent className="sm:max-w-lg gap-6">
          <AlertDialogHeader className="space-y-4">
            <AlertDialogTitle className="flex flex-col items-center gap-4 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <span className="text-xl">Inicia sesión para chatear</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base leading-relaxed max-w-sm mx-auto">
              Para contactar a <span className="font-semibold text-foreground">{sellerName || "este vendedor"}</span> y acceder a todas las funciones, necesitas una cuenta en Mercado Productivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col sm:flex-row sm:justify-center items-center gap-3 sm:gap-4 mt-2 w-full flex-wrap">
            <AlertDialogCancel className="w-full sm:w-auto min-w-[100px] mt-0">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleAuthRedirect("/auth/register")}
              className="w-full sm:w-auto min-w-[130px] bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Crear cuenta
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleAuthRedirect("/auth/login")}
              className="w-full sm:w-auto min-w-[130px]"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Iniciar sesión
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Chat Window (solo si autenticado) */}
      {isAuthenticated && (
        <BuyerConversationWindow
          open={open}
          onOpenChange={setOpen}
          sellerId={sellerId}
          sellerName={sellerName || undefined}
          sellerAvatarUrl={sellerAvatarUrl || undefined}
          currentUserEmail={""}
        />
      )}
    </>
  );
}
