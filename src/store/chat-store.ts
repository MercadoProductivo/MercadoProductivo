import { create } from 'zustand';
import type { ChatItem } from "@/components/chat/chat-messages";

interface ChatState {
    // Estado de la conversación activa
    activeConversationId: string | null;
    timeline: ChatItem[];
    loading: boolean;
    loadingOlder: boolean;
    hasMoreOlder: boolean;
    connState: string;
    isTyping: boolean;
    lastReadAt: string | null;

    // Participantes (caché básico)
    selfId: string | null;
    selfProfile: { name: string; email: string; avatarUrl: string } | null;

    // Acciones
    setActiveConversation: (id: string | null) => void;
    setSelfProfile: (id: string, profile: { name: string; email: string; avatarUrl: string }) => void;
    setTimeline: (messages: ChatItem[]) => void;
    addMessage: (message: ChatItem) => void;
    prependMessages: (messages: ChatItem[]) => void;
    updateMessage: (tempId: string, serverId: string, created_at?: string) => void;
    setLoading: (loading: boolean) => void;
    setLoadingOlder: (loading: boolean) => void;
    setHasMoreOlder: (hasMore: boolean) => void;
    setConnState: (state: string) => void;
    setIsTyping: (typing: boolean) => void;
    setLastReadAt: (date: string | null) => void;
    reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    activeConversationId: null,
    timeline: [],
    loading: false,
    loadingOlder: false,
    hasMoreOlder: true,
    connState: "disconnected",
    isTyping: false,
    lastReadAt: null,
    selfId: null,
    selfProfile: null,

    setActiveConversation: (id) => set({ activeConversationId: id, timeline: [], hasMoreOlder: true, loading: false }),

    setSelfProfile: (id, profile) => set({ selfId: id, selfProfile: profile }),

    setTimeline: (messages) => set({ timeline: messages }),

    addMessage: (message) => set((state) => {
        // Evitar duplicados
        if (state.timeline.some(m => m.id === message.id)) return state;
        const next = [...state.timeline, message].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return { timeline: next };
    }),

    prependMessages: (messages) => set((state) => {
        const existingIds = new Set(state.timeline.map(m => m.id));
        const newMessages = messages.filter(m => !existingIds.has(m.id));
        const next = [...newMessages, ...state.timeline].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return { timeline: next };
    }),

    updateMessage: (tempId, serverId, created_at) => set((state) => ({
        timeline: state.timeline.map(msg =>
            msg.id === tempId
                ? { ...msg, id: `msg-${serverId}`, created_at: created_at || msg.created_at }
                : msg
        )
    })),

    setLoading: (loading) => set({ loading }),
    setLoadingOlder: (loading) => set({ loadingOlder: loading }),
    setHasMoreOlder: (hasMore) => set({ hasMoreOlder: hasMore }),
    setConnState: (state) => set({ connState: state }),
    setIsTyping: (typing) => set({ isTyping: typing }),
    setLastReadAt: (date) => set({ lastReadAt: date }),

    reset: () => set({
        activeConversationId: null,
        timeline: [],
        loading: false,
        loadingOlder: false,
        hasMoreOlder: true,
        connState: "disconnected",
        isTyping: false,
        lastReadAt: null
    })
}));
