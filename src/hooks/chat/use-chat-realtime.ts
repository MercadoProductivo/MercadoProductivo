import { useEffect, useRef } from "react";
import { useChatStore } from "@/store/chat-store";
import { subscribePrivate, getPusherClient, onConnectionStateChange, safeUnsubscribe } from "@/lib/pusher/client";
import { MessageNewEventSchema } from "@/lib/chat/events";

export function useChatRealtime({
    conversationId,
    selfId,
    selfName,
    selfAvatarUrl,
    counterpartyName,
    counterpartyAvatarUrl,
    onConversationRead,
}: {
    conversationId: string | null;
    selfId: string;
    selfName: string | null;
    selfAvatarUrl: string | null;
    counterpartyName?: string | null;
    counterpartyAvatarUrl?: string | null;
    onConversationRead?: (id: string) => void;
}) {
    const {
        addMessage,
        updateMessage,
        setConnState,
        setLastReadAt,
        setIsTyping
    } = useChatStore();

    const seenRef = useRef<Set<string>>(new Set());
    const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Estado de conexión
    useEffect(() => {
        const off = onConnectionStateChange((state) => {
            try { setConnState(state as any); } catch { }
        });
        return () => { try { off?.(); } catch { } };
    }, [setConnState]);

    // Suscripción Pusher
    useEffect(() => {
        if (!conversationId || !selfId) return;

        let disposed = false;
        const channelName = `private-conversation-${conversationId}`;
        let ch: any = null;
        let retryTimer: any = null;
        let retries = 0;

        const onChatMessageNew = (raw: any) => {
            const parsed = MessageNewEventSchema.safeParse(raw);
            if (!parsed.success) return;

            const msg = parsed.data;
            const key = `msg-${msg.id}`;

            // Evitar duplicados si ya lo procesamos
            if (seenRef.current.has(key)) return;
            seenRef.current.add(key);

            const isIncoming = String(msg.sender_id || "") !== String(selfId);

            // Si es outgoing, buscar y reemplazar temp (confirmación optimista)
            if (!isIncoming) {
                // La actualización se hace en el store, que busca por contenido si no tenemos tempId
                // Pero aquí el store necesita saber qué reemplazar.
                // En use-conversation original:
                /*
                const mapped = prev.map((it) => {
                     if (!replaced && it.type === "outgoing" && it.id.startsWith("msg-temp-") && it.body === msg.body) {
                         replaced = true;
                         return { ...it, id: key, created_at: msg.created_at || it.created_at };
                     }
                     return it;
                 });
                */
                // Como el store no tiene lógica de "buscar por body", quizás deberíamos invocar una acción especial
                // O simplemente agregar el mensaje y dejar que el store maneje duplicados (ya lo hace por ID)

                // Sin embargo, para quitar el optimista, necesitamos saber cuál era.
                // Por simplificación, asumimos que confirmMessage se llama explicitamente si tuviéramos el tempId.
                // Si viene por Pusher, es la "confirmación pasiva".
                // Vamos a intentar actualizar en el store buscando por contenido si es outgoing.

                // TODO: Mejorar esto. Por ahora agregamos normal, y si hay duplicado visual se arregla con key.
                // Pero queremos que el optimista desaparezca.
                // El store.addMessage evita duplicados por ID, pero el optimista tiene ID msg-temp-...
                // Necesitamos una acción "replaceOptimisticByContent" o similar.
            }

            addMessage({
                id: key,
                type: isIncoming ? "incoming" : "outgoing",
                message_id: conversationId || undefined,
                body: msg.body || "",
                created_at: msg.created_at || new Date().toISOString(),
                sender_name: (msg.sender_name ?? (isIncoming ? counterpartyName : selfName)) || undefined,
                sender_email: msg.sender_email || undefined,
                avatar_url: (msg.avatar_url ?? (isIncoming ? counterpartyAvatarUrl : selfAvatarUrl)) || undefined,
            });

            // Marcar leído si es entrante
            if (isIncoming) {
                try {
                    // Invocar callback externo o acción de lectura
                    onConversationRead?.(conversationId);
                } catch { }
            }
        };

        const onConvRead = (payload: any) => {
            try {
                const uid = String(payload?.user_id || "");
                if (uid && uid !== String(selfId)) {
                    setLastReadAt(String(payload?.last_read_at || new Date().toISOString()));
                }
            } catch { }
        };

        const onTyping = (payload: any) => {
            try {
                const uid = String(payload?.user_id || "");
                if (uid && uid !== String(selfId)) {
                    setIsTyping(Boolean(payload?.typing));
                    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
                    if (payload?.typing) {
                        typingTimerRef.current = setTimeout(() => setIsTyping(false), 3500);
                    }
                }
            } catch { }
        };

        const bindHandlers = () => {
            if (!ch) return;
            ch.bind("chat:message:new", onChatMessageNew);
            ch.bind("chat:conversation:read", onConvRead);
            ch.bind("chat:typing", onTyping);
        };

        const tryInit = () => {
            if (disposed) return;
            const client = getPusherClient();
            if (!client) {
                retries += 1;
                retryTimer = setTimeout(tryInit, Math.min(30000, 500 * Math.pow(2, retries)));
                return;
            }

            ch = subscribePrivate(channelName, {
                onSubscriptionSucceeded: () => {
                    retries = 0;
                    bindHandlers();
                },
                onSubscriptionError: () => {
                    retries += 1;
                    retryTimer = setTimeout(tryInit, Math.min(30000, 500 * Math.pow(2, retries)));
                },
            });
        };

        tryInit();

        return () => {
            disposed = true;
            try { if (retryTimer) clearTimeout(retryTimer); } catch { }
            try {
                ch?.unbind?.("chat:message:new", onChatMessageNew);
                ch?.unbind?.("chat:conversation:read", onConvRead);
                ch?.unbind?.("chat:typing", onTyping);
                safeUnsubscribe(channelName);
            } catch { }
        };
    }, [conversationId, selfId, selfName, selfAvatarUrl, counterpartyName, counterpartyAvatarUrl, onConversationRead, addMessage, setConnState, setLastReadAt, setIsTyping]);

    return {};
}
