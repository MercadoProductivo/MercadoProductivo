"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface VerifiedBadgeProps {
    isVerified: boolean;
}

/**
 * Badge de verificación interactivo.
 * - Muestra solo icono por defecto
 * - Al hacer click se expande mostrando "Verificado" con animación
 * - Se contrae automáticamente después de 2 segundos
 */
export default function VerifiedBadge({ isVerified }: VerifiedBadgeProps) {
    const [expanded, setExpanded] = useState(false);

    const handleClick = () => {
        if (!isVerified) return;
        setExpanded(true);
        // Auto-collapse después de 2 segundos
        setTimeout(() => setExpanded(false), 2000);
    };

    if (!isVerified) {
        return (
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-slate-600/50 text-slate-400">
                <Check className="h-4 w-4" />
            </div>
        );
    }

    return (
        <button
            onClick={handleClick}
            className={cn(
                "flex items-center justify-center gap-1.5 rounded-full font-medium text-sm transition-all duration-300 ease-out",
                "bg-emerald-500 text-white shadow-lg hover:bg-emerald-600 hover:shadow-emerald-500/25",
                "active:scale-95",
                expanded
                    ? "h-8 px-3 min-w-[100px]"
                    : "h-8 w-8 hover:scale-110"
            )}
            title={expanded ? "" : "Cuenta verificada"}
        >
            <Check className={cn(
                "transition-transform duration-300",
                expanded ? "h-4 w-4" : "h-4 w-4"
            )} />
            <span className={cn(
                "overflow-hidden whitespace-nowrap transition-all duration-300",
                expanded ? "max-w-[80px] opacity-100" : "max-w-0 opacity-0"
            )}>
                Verificado
            </span>
        </button>
    );
}
