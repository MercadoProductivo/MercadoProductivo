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
    // Re-evaluar en tiempo real
    const standaloneNow = typeof window !== 'undefined' && (
      (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      (navigator as any).standalone === true
    );

    if (standaloneNow || isStandalone) {
      toast.success("Ya estás usando la aplicación instalada.");
      return;
    }

    const result = await install();

    if (result === 'accepted') {
      toast.success("¡Instalación iniciada correctamente!");
    } else if (result === 'ios-instructions') {
      toast.info(
        "Para instalar en iOS: pulsa el icono de 'Compartir' (el cuadrado con flecha) y selecciona 'Añadir a pantalla de inicio'.",
        { duration: 6000 }
      );
    } else if (result === 'unavailable') {
      // Fallback: si el SW aún no controla la página
      const swLoading = typeof navigator !== 'undefined' && 'serviceWorker' in navigator && !navigator.serviceWorker.controller;
      if (swLoading) {
        toast.error("El sistema de instalación se está preparando. Prueba a recargar la página en unos segundos.");
      } else {
        toast.error(
          "La instalación no está disponible en este navegador. Asegúrate de estar usando Chrome, Edge o Safari (iOS) y de no estar en modo incógnito."
        );
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
