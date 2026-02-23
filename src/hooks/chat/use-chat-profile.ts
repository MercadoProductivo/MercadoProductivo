import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useChatStore } from "@/store/chat-store";

export function useChatProfile(selfId: string) {
    const { setSelfProfile, selfProfile } = useChatStore();
    const supabase = createClient();

    useEffect(() => {
        if (!selfId) return;

        // Si ya tenemos perfil cargado para este ID, evitar refetch
        // (Opcional, pero ayuda a performance)

        (async () => {
            try {
                const [{ data: auth }, { data }] = await Promise.all([
                    supabase.auth.getUser(),
                    supabase
                        .from("profiles")
                        .select("full_name,avatar_url")
                        .eq("id", selfId)
                        .maybeSingle() as any,
                ]);

                setSelfProfile(selfId, {
                    name: (data?.full_name || "").toString().trim(),
                    email: (auth?.user?.email || "").toString().trim(),
                    avatarUrl: (data?.avatar_url || "").toString().trim(),
                });
            } catch { }
        })();
    }, [supabase, selfId, setSelfProfile]);

    return selfProfile;
}
