import { useCallback } from "react";
import { useChatStore } from "@/store/chat-store";
import type { ChatItem } from "@/components/chat/chat-messages";

export function useChatSender({
    selfName,
    selfEmail,
    selfAvatarUrl,
}: {
    selfName: string | null;
    selfEmail: string | null;
    selfAvatarUrl: string | null;
}) {
    const { addMessage, updateMessage, timeline } = useChatStore();

    const addOptimisticMessage = useCallback(
        (msg: Omit<ChatItem, "id"> & { tempId?: string }): string => {
            const tempId = msg.tempId || `msg-temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

            addMessage({
                ...msg,
                id: tempId,
                sender_name: msg.sender_name || selfName || undefined,
                sender_email: msg.sender_email || selfEmail || undefined,
                avatar_url: msg.avatar_url || selfAvatarUrl || undefined,
            });

            return tempId;
        },
        [selfName, selfEmail, selfAvatarUrl, addMessage]
    );

    const confirmMessage = useCallback((tempId: string, serverId: string) => {
        updateMessage(tempId, serverId, new Date().toISOString());
    }, [updateMessage]);

    return { addOptimisticMessage, confirmMessage };
}
