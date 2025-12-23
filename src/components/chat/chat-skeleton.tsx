"use client";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton para mensajes de chat durante la carga.
 * Alterna entre mensajes entrantes y salientes para simular conversación real.
 */
export function ChatMessagesSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="flex flex-col gap-4 px-2 py-4 animate-in fade-in-0 duration-500">
            {Array.from({ length: count }).map((_, i) => {
                const isOutgoing = i % 3 === 0; // Cada 3er mensaje es saliente
                const isShort = i % 2 === 0;

                return (
                    <div
                        key={i}
                        className={cn(
                            "flex items-end gap-2.5",
                            isOutgoing ? "justify-end" : "justify-start"
                        )}
                    >
                        {/* Avatar skeleton (entrante) */}
                        {!isOutgoing && (
                            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        )}

                        {/* Burbuja skeleton */}
                        <div className={cn(
                            "flex flex-col gap-2 rounded-2xl px-4 py-3",
                            isOutgoing
                                ? "bg-orange-100/50 rounded-br-md"
                                : "bg-slate-100 rounded-bl-md",
                            isShort ? "max-w-[40%]" : "max-w-[65%]"
                        )}>
                            {/* Nombre (solo entrante) */}
                            {!isOutgoing && (
                                <Skeleton className="h-3 w-16" />
                            )}
                            {/* Texto del mensaje */}
                            <Skeleton className={cn("h-4", isShort ? "w-24" : "w-40")} />
                            {!isShort && <Skeleton className="h-4 w-32" />}
                            {/* Timestamp */}
                            <Skeleton className="h-2 w-12 self-end" />
                        </div>

                        {/* Avatar skeleton (saliente) */}
                        {isOutgoing && (
                            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/**
 * Skeleton para una conversación en la lista/bandeja.
 */
export function ConversationItemSkeleton() {
    return (
        <div className="flex items-center gap-3 px-4 py-3 border-b animate-pulse">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-3/4" />
            </div>
        </div>
    );
}

/**
 * Skeleton para la lista completa de conversaciones.
 */
export function ConversationsListSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="animate-in fade-in-0 duration-500">
            {Array.from({ length: count }).map((_, i) => (
                <ConversationItemSkeleton key={i} />
            ))}
        </div>
    );
}

/**
 * Skeleton para el header del chat.
 */
export function ChatHeaderSkeleton() {
    return (
        <div className="flex items-center gap-3 p-4 border-b animate-pulse">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
        </div>
    );
}
