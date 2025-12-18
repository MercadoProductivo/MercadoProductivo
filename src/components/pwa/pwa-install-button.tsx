"use client";

import { Download, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/use-pwa";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

interface PWAInstallButtonProps {
    className?: string;
    variant?: "default" | "outline" | "ghost";
    size?: "sm" | "default" | "lg";
    showLabel?: boolean;
}

export function PWAInstallButton({
    className,
    variant = "outline",
    size = "sm",
    showLabel = true,
}: PWAInstallButtonProps) {
    const { canInstall, isInstalling, isInstalled, isLoading, install, hasDeferredPrompt } = usePWA();
    const [justInstalled, setJustInstalled] = useState(false);

    // Mientras carga, no mostrar nada
    if (isLoading) {
        return null;
    }

    // Si ya está instalada (ejecutándose como PWA), no mostrar
    if (isInstalled) {
        return null;
    }

    const handleClick = async () => {
        // Diagnóstico para debugging
        console.log("[PWA Button] Click - canInstall:", canInstall, "hasDeferredPrompt:", hasDeferredPrompt());

        if (!canInstall) {
            // El evento beforeinstallprompt no llegó aún
            // Posibles razones: SW no registrado, no HTTPS, criterios no cumplidos
            toast.info(
                "La instalación estará disponible en unos segundos. Si no aparece, recarga la página.",
                { duration: 5000 }
            );
            return;
        }

        const result = await install();

        if (result === "accepted") {
            setJustInstalled(true);
            toast.success("¡App instalada correctamente!");
            setTimeout(() => setJustInstalled(false), 3000);
        } else if (result === "dismissed") {
            toast.info("Instalación cancelada. Puedes intentarlo de nuevo cuando quieras.");
        } else {
            toast.error("No se pudo instalar. Intenta recargar la página.");
        }
    };

    // Mostrar el botón siempre (a menos que esté instalada)
    // Si no hay deferredPrompt, el click mostrará un mensaje explicativo
    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={isInstalling}
            className={cn(
                "gap-2 transition-all",
                justInstalled && "bg-green-500 text-white hover:bg-green-600",
                !canInstall && !isInstalling && "opacity-80",
                className
            )}
        >
            {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : justInstalled ? (
                <Check className="h-4 w-4" />
            ) : !canInstall ? (
                <AlertCircle className="h-4 w-4" />
            ) : (
                <Download className="h-4 w-4" />
            )}
            {showLabel && (
                <span className="hidden sm:inline">
                    {isInstalling ? "Instalando..." : justInstalled ? "¡Instalada!" : "Instalar"}
                </span>
            )}
        </Button>
    );
}

export default PWAInstallButton;
