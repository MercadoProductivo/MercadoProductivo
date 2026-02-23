"use client";

import React, { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ChatMessages from "./chat-messages";
import ConversationChatInput, { ChatV2Sent } from "./conversation-chat-input";
import { useConversation } from "@/hooks/use-conversation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { displayNameFromTimeline, headerAvatarFromTimeline, avatarAltHeader } from "@/lib/user-display";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import confirmModal from "@/components/ui/confirm-modal";
import { MoreVertical, X } from "lucide-react";

export default function SellerConversationPanel({
  conversationId,
  selfId,
  counterpartyName,
  counterpartyAvatarUrl,
  onConversationRead,
  onClose,
}: {
  conversationId: string;
  selfId: string;
  counterpartyName?: string | null;
  counterpartyAvatarUrl?: string | null;
  onConversationRead?: (conversationId: string) => void;
  onClose?: () => void;
}) {
  const {
    timeline,
    loading,
    connState,
    isTyping,
    lastReadAt,
    scrollRef,
    loadOlder,
    hasMoreOlder,
    loadingOlder,
  } = useConversation({
    conversationId,
    selfId,
    counterpartyName,
    counterpartyAvatarUrl,
    onConversationRead,
  });

  const headerName = useMemo(() => displayNameFromTimeline(timeline, counterpartyName), [timeline, counterpartyName]);
  const headerAvatar = useMemo(() => headerAvatarFromTimeline(timeline, counterpartyAvatarUrl), [timeline, counterpartyAvatarUrl]);

  async function onHideConversation() {
    try {
      const ok = await confirmModal({
        title: "Ocultar conversación",
        description:
          "Se ocultará esta conversación solo para ti. Volverá a aparecer automáticamente si hay nueva actividad.",
        confirmText: "Ocultar",
        cancelText: "Cancelar",
      });
      if (!ok) return;
      const res = await fetch(`/api/chat/conversations/${encodeURIComponent(conversationId)}/hide`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.message || j?.error || "No se pudo ocultar");
      toast.success("Conversación oculta");
      if (onClose) onClose();
    } catch (e: any) {
      toast.error(e?.message || "Error al ocultar la conversación");
    }
  }

  function handleSent(evt: ChatV2Sent) {
    // The message will be added optimistically by the ConversationChatInput or picked up by Realtime via useConversation
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-8 w-8">
              <AvatarImage src={headerAvatar} alt={avatarAltHeader(headerName)} />
              <AvatarFallback>{(((headerName || "U")[0]) || "U").toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium text-base">{headerName || ""}</div>
              <div className="truncate text-xs text-muted-foreground">Conversación</div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <span className={cn("h-2 w-2 rounded-full",
                  connState === "connected" ? "bg-emerald-500" :
                    (connState === "connecting" || connState === "unavailable") ? "bg-amber-500" :
                      "bg-red-500"
                )} />
                <span>
                  {connState === "connected" ? "Conectado" : (connState === "connecting" || connState === "unavailable") ? "Reconectando..." : "Desconectado"}
                </span>
              </div>
              {isTyping && (
                <div className="mt-0.5 text-xs text-muted-foreground italic">Escribiendo…</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onClose ? (
              <Button variant="ghost" size="icon" aria-label="Cerrar" title="Cerrar" onClick={() => { try { onClose(); } catch { } }}>
                <X className="h-5 w-5" />
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más acciones" title="Más acciones">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onHideConversation}>Ocultar conversación</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div className={cn("flex min-h-0 flex-1 flex-col")}>
        <div ref={scrollRef as React.RefObject<HTMLDivElement>} className="flex-1 overflow-y-auto p-3">
          {loading ? (
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
                <div className="p-3 text-sm text-muted-foreground">No hay mensajes en esta conversación.</div>
              ) : (
                <ChatMessages items={timeline} lastReadAt={lastReadAt ?? undefined} />
              )}
            </>
          )}
        </div>
        <div className="border-t p-3">
          <ConversationChatInput conversationId={conversationId} onSent={handleSent} />
        </div>
      </div>
    </div>
  );
}
