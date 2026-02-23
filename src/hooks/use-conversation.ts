"use client";

import { useRef, useEffect } from "react";
import { useChatStore } from "@/store/chat-store";
import { useChatFetcher } from "./chat/use-chat-fetcher";
import { useChatRealtime } from "./chat/use-chat-realtime";
import { useChatSender } from "./chat/use-chat-sender";
import { useChatProfile } from "./chat/use-chat-profile";
import type { ChatItem } from "@/components/chat/chat-messages";

export type UseConversationOptions = {
    conversationId: string | null;
    selfId: string;
    counterpartyId?: string;
    counterpartyName?: string | null;
    counterpartyAvatarUrl?: string | null;
    onConversationRead?: (conversationId: string) => void;
};

export type UseConversationReturn = {
    timeline: ChatItem[];
    loading: boolean;
    connState: string;
    isTyping: boolean;
    lastReadAt: string | null;
    selfName: string | null;
    selfEmail: string | null;
    selfAvatarUrl: string | null;
    addOptimisticMessage: (msg: Omit<ChatItem, "id"> & { tempId?: string }) => string;
    confirmMessage: (tempId: string, serverId: string) => void;
    scrollRef: React.RefObject<HTMLDivElement | null>;
    markAsRead: () => Promise<void>;
    loadOlder: () => Promise<void>;
    hasMoreOlder: boolean;
    loadingOlder: boolean;
};

/**
 * Hook unificado para manejo de conversaciones de chat (Refactorizado).
 * Utiliza Zustand stack y hooks especializados.
 */
export function useConversation({
    conversationId,
    selfId,
    counterpartyName,
    counterpartyAvatarUrl,
    onConversationRead,
}: UseConversationOptions): UseConversationReturn {

    const store = useChatStore();
    const scrollRef = useRef<HTMLDivElement | null>(null);

    // 1. Cargar perfil propio
    useChatProfile(selfId);

    // 2. Fetching de mensajes
    const { loadOlder } = useChatFetcher({
        conversationId,
        selfId,
        onConversationRead
    });

    // 3. Suscripción Realtime
    useChatRealtime({
        conversationId,
        selfId,
        selfName: store.selfProfile?.name || null,
        selfAvatarUrl: store.selfProfile?.avatarUrl || null,
        counterpartyName,
        counterpartyAvatarUrl,
        onConversationRead
    });

    // 4. Envío de mensajes
    const { addOptimisticMessage, confirmMessage } = useChatSender({
        selfName: store.selfProfile?.name || null,
        selfEmail: store.selfProfile?.email || null,
        selfAvatarUrl: store.selfProfile?.avatarUrl || null,
    });

    // Auto-scroll al recibir mensajes nuevos (solo si estamos cerca del final o es mensaje propio)
    // Por simplicidad, mantenemos el comportamiento original: al cambiar timeline scroll al final
    useEffect(() => {
        const el = scrollRef.current;
        if (el) {
            // TODO: Mejorar lógica de scroll para no saltar si el usuario está leyendo arriba
            el.scrollTop = el.scrollHeight;
        }
    }, [store.timeline]);

    // Compatibilidad con markAsRead manual (aunque fetcher y realtime ya lo hacen)
    const markAsRead = async () => {
        // No-op explícito o lógica redundante si se desea
    };

    return {
        timeline: store.timeline,
        loading: store.loading,
        connState: store.connState,
        isTyping: store.isTyping,
        lastReadAt: store.lastReadAt,
        selfName: store.selfProfile?.name || null,
        selfEmail: store.selfProfile?.email || null,
        selfAvatarUrl: store.selfProfile?.avatarUrl || null,
        addOptimisticMessage,
        confirmMessage,
        scrollRef,
        markAsRead,
        loadOlder,
        hasMoreOlder: store.hasMoreOlder,
        loadingOlder: store.loadingOlder,
    };
}
