"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePWAInstall, checkIfReallyInstalled } from "@/hooks/use-pwa-install";
import { toast } from "sonner";

type Props = {
  className?: string;
  fullWidth?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "secondary" | "outline" | "ghost";
  label?: string;
};

export default function PWAInstallButton({ className, fullWidth, size = "sm", variant = "outline", label = "Instalar app" }: Props) {
  const { canInstall, isIOS, isStandalone, install } = usePWAInstall();

  // Mostramos siempre el botón. Si ya está instalada, al hacer click mostramos un toast informativo.

  const handleClick = async () => {
    // === DIAGNÓSTICO PWA VISUAL ===
    const diagInfo = {
      canInstall,
      isIOS,
      isStandalone,
      hasDeferred: !!(window as any).__mpDefer,
      swController: !!navigator.serviceWorker?.controller,
      displayMode: window.matchMedia?.('(display-mode: standalone)')?.matches,
    };

    // Mostrar diagnóstico como toast visible
    toast.info(`🔍 SW: ${diagInfo.swController ? '✅' : '❌'} | Evento: ${diagInfo.hasDeferred ? '✅' : '❌'} | canInstall: ${diagInfo.canInstall ? '✅' : '❌'}`, { duration: 8000 });

    console.log('[PWA Install] Diagnóstico:', diagInfo);

    // Usar checkIfReallyInstalled para evitar falsos positivos en Chrome Android
    const isReallyInstalled = await checkIfReallyInstalled();
    console.log('[PWA Install] isReallyInstalled:', isReallyInstalled);

    if (isReallyInstalled) {
      toast.error("La app ya está instalada en este dispositivo.");
      return;
    }

    // En iOS no mostramos modal ni toast: no hay beforeinstallprompt programable.
    if (isIOS) {
      toast.info("Para instalar en iOS: toca el botón Compartir y luego 'Añadir a pantalla de inicio'");
      return;
    }

    if (canInstall) {
      const result = await install();
      console.log('[PWA Install] Resultado install():', result);
    } else {
      // Intentar obtener el evento diferido directamente
      const hasDeferred = !!(window as any).__mpDefer;
      console.log('[PWA Install] canInstall=false, hasDeferred:', hasDeferred);

      if (hasDeferred) {
        // El evento existe pero no se sincronizó - intentar instalar de todos modos
        const result = await install();
        console.log('[PWA Install] Resultado install() con deferred manual:', result);
        return;
      }

      // Fallback: si el SW aún no controla la página en producción, pedir recargar
      const needsReload = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !navigator.serviceWorker.controller;
      if (needsReload) {
        toast.error("La instalación estará disponible tras recargar la página.");
      } else {
        // Mostrar info de diagnóstico al usuario para debugging
        toast.error(`Instalación no disponible. SW: ${diagInfo.swController ? 'OK' : 'No'}, Evento: ${diagInfo.hasDeferred ? 'OK' : 'No'}`);
      }
    }
  };

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={() => { void handleClick(); }}
        className={cn(fullWidth ? "w-full justify-center" : "", className)}
      >
        <Download className="h-4 w-4 mr-2" /> {label}
      </Button>
    </>
  );
}
