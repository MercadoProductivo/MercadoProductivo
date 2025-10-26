"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePWAInstall } from "@/hooks/use-pwa-install";
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
    // Re-evaluar en tiempo real por si el estado aún no se sincronizó
    const standaloneNow = typeof window !== 'undefined' && (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (navigator as any).standalone === true
    );
    if (standaloneNow || isStandalone) {
      toast.error("La app ya está instalada en este dispositivo.");
      return;
    }

    // En iOS no mostramos modal ni toast: no hay beforeinstallprompt programable.
    if (isIOS) return;
    if (canInstall) {
      await install();
    } else {
      // Fallback: si el SW aún no controla la página en producción, pedir recargar
      const needsReload = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !navigator.serviceWorker.controller;
      if (needsReload) {
        toast.error("La instalación estará disponible tras recargar la página.");
      } else {
        toast.error("La app ya está instalada en este dispositivo o la instalación no está disponible en este momento.");
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
