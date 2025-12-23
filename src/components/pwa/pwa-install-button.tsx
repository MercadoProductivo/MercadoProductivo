"use client";

import { DownloadIcon, LoaderPinwheelIcon, CheckIcon, AlertCircleIcon, LoaderPinwheelIconHandle } from "@/components/animated-icons";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/use-pwa";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
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
    const { canInstall, isInstalling, isInstalled, isLoading, install } = usePWA();
    const [justInstalled, setJustInstalled] = useState(false);
    const loaderRef = useRef<LoaderPinwheelIconHandle>(null);

    // Start/stop loader animation based on installing state
    useEffect(() => {
        if (isInstalling) {
            loaderRef.current?.startAnimation();
        } else {
            loaderRef.current?.stopAnimation();
        }
    }, [isInstalling]);

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
                <LoaderPinwheelIcon ref={loaderRef} size={16} />
            ) : justInstalled ? (
                <CheckIcon size={16} />
            ) : !canInstall ? (
                <AlertCircleIcon size={16} />
            ) : (
                <DownloadIcon size={16} />
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

