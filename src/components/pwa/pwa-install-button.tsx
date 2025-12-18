"use client";

import { Download, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePWA } from "@/hooks/use-pwa";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
    const { canInstall, isInstalling, isInstalled, install } = usePWA();
    const [justInstalled, setJustInstalled] = useState(false);

    // No mostrar si ya está instalada o no disponible
    if (isInstalled || (!canInstall && !isInstalling && !justInstalled)) {
        return null;
    }

    const handleClick = async () => {
        const result = await install();
        if (result === "accepted") {
            setJustInstalled(true);
            setTimeout(() => setJustInstalled(false), 3000);
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={isInstalling}
            className={cn(
                "gap-2 transition-all",
                justInstalled && "bg-green-500 text-white hover:bg-green-600",
                className
            )}
        >
            {isInstalling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : justInstalled ? (
                <Check className="h-4 w-4" />
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
