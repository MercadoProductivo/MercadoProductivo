"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    UsersIcon,
    EarthIcon,
    AlertCircleIcon,
    PackageIcon
} from "@/components/animated-icons";

export type EmptyStateVariant = "empty" | "error";
export type EmptyStateType = "sellers" | "exporters" | "products" | "services" | "generic";

interface EmptyStateProps {
    /** Tipo de contenido vacío */
    type?: EmptyStateType;
    /** Variante visual: vacío vs error */
    variant?: EmptyStateVariant;
    /** Título principal */
    title?: string;
    /** Descripción secundaria */
    description?: string;
    /** Icono personalizado (opcional) */
    icon?: React.ReactNode;
    /** Texto del botón de acción */
    actionLabel?: string;
    /** Enlace del botón de acción */
    actionHref?: string;
    /** Clases adicionales */
    className?: string;
}

const defaultContent: Record<EmptyStateType, { title: string; description: string; icon: React.ReactNode }> = {
    sellers: {
        title: "No hay vendedores disponibles",
        description: "Actualmente no hay vendedores registrados en la plataforma. ¡Sé el primero en ofrecer tus productos!",
        icon: <UsersIcon className="text-orange-400" size={64} aria-hidden="true" />,
    },
    exporters: {
        title: "No hay exportadores disponibles",
        description: "Aún no hay empresas exportadoras registradas. Pronto podrás encontrar grandes oportunidades de negocio.",
        icon: <EarthIcon className="text-orange-400" size={64} aria-hidden="true" />,
    },
    products: {
        title: "No hay productos disponibles",
        description: "No se encontraron productos que coincidan con tu búsqueda.",
        icon: <PackageIcon className="text-orange-400" size={64} aria-hidden="true" />,
    },
    services: {
        title: "No hay servicios disponibles",
        description: "No se encontraron servicios que coincidan con tu búsqueda.",
        icon: <PackageIcon className="text-orange-400" size={64} aria-hidden="true" />,
    },
    generic: {
        title: "Sin resultados",
        description: "No hay elementos para mostrar en este momento.",
        icon: <PackageIcon className="text-gray-400" size={64} aria-hidden="true" />,
    },
};

const errorContent: Record<EmptyStateType, { title: string; description: string }> = {
    sellers: {
        title: "No se pudieron cargar los vendedores",
        description: "Hubo un problema al obtener la lista de vendedores. Por favor, intenta nuevamente más tarde.",
    },
    exporters: {
        title: "No se pudieron cargar los exportadores",
        description: "Hubo un problema al obtener la lista de exportadores. Por favor, intenta nuevamente más tarde.",
    },
    products: {
        title: "Error al cargar productos",
        description: "Hubo un problema al obtener los productos. Por favor, intenta nuevamente.",
    },
    services: {
        title: "Error al cargar servicios",
        description: "Hubo un problema al obtener los servicios. Por favor, intenta nuevamente.",
    },
    generic: {
        title: "Error al cargar datos",
        description: "Hubo un problema al obtener la información. Por favor, intenta nuevamente.",
    },
};

/**
 * Componente de estado vacío reutilizable.
 * 
 * Muestra una UI amigable cuando no hay datos disponibles o cuando ocurre un error.
 * Cumple con WCAG 2.1 para accesibilidad.
 */
export function EmptyState({
    type = "generic",
    variant = "empty",
    title,
    description,
    icon,
    actionLabel,
    actionHref,
    className,
}: EmptyStateProps) {
    const isError = variant === "error";
    const content = isError ? errorContent[type] : defaultContent[type];
    const defaultIcon = isError ? (
        <AlertCircleIcon className="text-red-400" size={64} aria-hidden="true" />
    ) : (
        defaultContent[type].icon
    );

    const displayTitle = title ?? content.title;
    const displayDescription = description ?? content.description;
    const displayIcon = icon ?? defaultIcon;

    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center py-16 px-4 sm:py-20 sm:px-6 lg:py-24",
                "animate-in fade-in-0 slide-in-from-bottom-4 duration-500",
                className
            )}
            role="status"
            aria-live="polite"
            aria-label={displayTitle}
        >
            {/* Contenedor con efecto visual */}
            <div
                className={cn(
                    "relative flex flex-col items-center text-center max-w-md mx-auto",
                    "p-8 sm:p-10 rounded-2xl",
                    "bg-gradient-to-b",
                    isError
                        ? "from-red-50 to-white border border-red-100"
                        : "from-orange-50 to-white border border-orange-100"
                )}
            >
                {/* Icono con animación sutil */}
                <div
                    className={cn(
                        "mb-6 p-4 rounded-full",
                        "animate-in zoom-in-50 duration-700 delay-150",
                        isError ? "bg-red-100/50" : "bg-orange-100/50"
                    )}
                >
                    {displayIcon}
                </div>

                {/* Título */}
                <h2
                    className={cn(
                        "text-xl sm:text-2xl font-bold mb-3",
                        isError ? "text-red-800" : "text-gray-900"
                    )}
                >
                    {displayTitle}
                </h2>

                {/* Descripción */}
                <p className="text-gray-600 text-sm sm:text-base leading-relaxed mb-6">
                    {displayDescription}
                </p>

                {/* Botón de acción (opcional) */}
                {actionLabel && actionHref && (
                    <Button
                        asChild
                        className={cn(
                            "mt-2 px-6 py-2.5 rounded-full font-medium transition-all duration-300",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                            isError
                                ? "bg-red-500 hover:bg-red-600 focus-visible:ring-red-500"
                                : "bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500",
                            "text-white shadow-md hover:shadow-lg"
                        )}
                    >
                        <Link href={actionHref}>{actionLabel}</Link>
                    </Button>
                )}

                {/* Decoración visual */}
                <div
                    className={cn(
                        "absolute -z-10 inset-0 rounded-2xl opacity-30",
                        "bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))]",
                        isError
                            ? "from-red-200 via-transparent to-transparent"
                            : "from-orange-200 via-transparent to-transparent"
                    )}
                    aria-hidden="true"
                />
            </div>
        </div>
    );
}

export default EmptyState;
