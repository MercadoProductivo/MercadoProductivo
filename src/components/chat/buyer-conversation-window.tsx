"use client";
import React, { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ChatMessages from "./chat-messages";
import BuyerChatInput, { BuyerInputSent } from "./buyer-chat-input";
import { useConversation } from "@/hooks/use-conversation";
import { displayNameFromTimeline, headerAvatarFromTimeline, avatarAltHeader } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function BuyerConversationWindow({
  open,
  onOpenChange,
  sellerId,
  sellerName,
  sellerAvatarUrl,
  currentUserEmail, // Prop mantenida por compatibilidad, aunque useConversation ya extrae email
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sellerId: string;
  sellerName?: string | null;
  sellerAvatarUrl?: string;
  currentUserEmail: string;
}) {
  const [threadId, setThreadId] = useState<string | null>(null);

  // Como BuyerConversationWindow solía crear la conversación si no existía, 
  // tenemos que manejar el inicio de conversación primero si es necesario.
  // Sin embargo, podemos dejar que BuyerChatInput siga haciéndolo, 
  // solo necesitamos pasarle el `threadId` una vez exista.

  // Utilizamos useConversation. Pasaremos el `threadId` como conversationId
  // si ya lo tenemos. 
  // Importante: selfId = auth.user.id no lo tenemos como prop, pero useConversation
  // idealmente no debería forzarnos a pasarlo si el store/hook ya lo saca de auth, 
  // pero el hook useConversation pide selfId. 
  // Vamos a obtener el UserId del layout o supabase

  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => {
        if (data?.user?.id) setCurrentUserId(data.user.id);
      });
    });
  }, []);

  const {
    timeline,
    loading,
    connState,
    isTyping,
    lastReadAt,
    addOptimisticMessage,
    scrollRef,
    loadOlder,
    hasMoreOlder,
    loadingOlder,
  } = useConversation({
    conversationId: open ? threadId : null,
    selfId: currentUserId,
    counterpartyName: sellerName,
    counterpartyAvatarUrl: sellerAvatarUrl,
  });

  // Intentar cargar o inicializar la conversación si no tenemos threadId
  useEffect(() => {
    if (open && !threadId && currentUserId) {
      // Pedir a la API el conversation ID
      fetch("/api/chat/conversations/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId: sellerId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.conversation_id) {
            setThreadId(data.conversation_id);
          }
        })
        .catch(() => {
          // Fallará silenciosamente si es chat nuevo. BuyerChatInput lo creará.
        });
    }
  }, [open, threadId, currentUserId, sellerId]);

  const headerName = useMemo(() => displayNameFromTimeline(timeline, sellerName), [timeline, sellerName]);
  const headerAvatar = useMemo(() => headerAvatarFromTimeline(timeline, sellerAvatarUrl), [timeline, sellerAvatarUrl]);

  function handleSent(evt: BuyerInputSent) {
    if (!threadId) {
      setThreadId(evt.message_id);
    }
    // Optimistic ya manejado o puede agregarse
    // useChatInput hace fetch POST directamente, y realtime lo recibe. 
    // Para no duplicar eventos, solo seteamos thread id y dejamos al realtime actualizar.
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] w-[96vw] max-w-2xl flex-col p-0">
        <DialogHeader className="border-b p-4">
          <div
            className="sm:hidden mx-auto mb-2 mt-1 h-1.5 w-12 rounded-full bg-muted"
            onTouchStart={(e) => {
              try { (e.currentTarget as any)._startY = e.touches?.[0]?.clientY ?? 0; (e.currentTarget as any)._deltaY = 0; } catch { }
            }}
            onTouchMove={(e) => {
              try {
                const startY = (e.currentTarget as any)._startY ?? null;
                if (startY == null) return;
                const y = e.touches?.[0]?.clientY ?? startY;
                (e.currentTarget as any)._deltaY = y - startY;
              } catch { }
            }}
            onTouchEnd={(e) => {
              try {
                const dy = (e.currentTarget as any)._deltaY ?? 0;
                if (dy > 60) onOpenChange(false);
                (e.currentTarget as any)._startY = null;
                (e.currentTarget as any)._deltaY = 0;
              } catch { }
            }}
          />
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={headerAvatar} alt={avatarAltHeader(headerName)} />
              <AvatarFallback>{(((headerName || "U")[0]) || "U").toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <DialogTitle className="truncate">{headerName || ""}</DialogTitle>
              <DialogDescription className="truncate">Conversación con el vendedor</DialogDescription>
              {isTyping && (
                <div className="mt-0.5 text-xs text-muted-foreground italic">Escribiendo…</div>
              )}
            </div>
          </div>
        </DialogHeader>
        <div className={cn("flex min-h-0 flex-1 flex-col")}>
          <div ref={scrollRef as React.RefObject<HTMLDivElement>} className="flex-1 overflow-y-auto p-3">
            {!currentUserId || loading ? (
              <div className="p-3 text-sm text-muted-foreground">Cargando...</div>
            ) : (
              <>
                {hasMoreOlder && timeline.length > 0 && (
                  <div className="mb-2 flex justify-center">
                    <Button size="sm" variant="outline" onClick={loadOlder} disabled={loadingOlder}>
                      {loadingOlder ? "Cargando..." : "Cargar mensajes anteriores"}
                    </Button>
                  </div>
                )}
                {timeline.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">Inicia la conversación</div>
                ) : (
                  <ChatMessages items={timeline} lastReadAt={lastReadAt ?? undefined} />
                )}
              </>
            )}
          </div>
          <div className="border-t p-3">
            <BuyerChatInput sellerId={sellerId} threadId={threadId} onSent={handleSent} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
