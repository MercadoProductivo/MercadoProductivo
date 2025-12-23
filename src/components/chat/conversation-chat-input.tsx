"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { enqueueConversationMessage } from "@/lib/chat/offline-queue";
import EmojiPicker from "./emoji-picker";

export type ChatV2Sent = {
  id: string;
  message_id: string; // conversation id
  body: string;
  created_at: string;
};

export default function ConversationChatInput({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent: (evt: ChatV2Sent) => void;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const valueRef = useRef<string>("");
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitAtRef = useRef<number>(0);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Mantener el foco al cambiar de conversación
  useEffect(() => {
    try { inputRef.current?.focus(); } catch { }
  }, [conversationId]);

  function fetchWithTimeout(url: string, opts: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
    const { timeoutMs = 10000, ...rest } = opts;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...rest, signal: controller.signal }).finally(() => clearTimeout(t));
  }

  const emitTyping = useCallback(async (typing: boolean, immediate = false) => {
    try {
      if (!conversationId) return;
      const now = Date.now();
      if (!immediate && typing && now - (lastTypingEmitAtRef.current || 0) < 1200) return;
      lastTypingEmitAtRef.current = now;
      await fetchWithTimeout(`/api/chat/conversations/${encodeURIComponent(conversationId)}/typing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typing: Boolean(typing) }),
        timeoutMs: 6000,
      });
    } catch { }
  }, [conversationId]);

  async function handleSend() {
    if (sending || !value.trim()) return;
    setSending(true);

    // Capturar y limpiar input de forma optimista sin perder el foco
    const bodyToSend = value.trim();
    const tempId = `temp-${Date.now()}`;
    const sentAt = new Date().toISOString();
    onSent?.({ id: tempId, message_id: conversationId, body: bodyToSend, created_at: sentAt });
    setValue("");
    try { inputRef.current?.focus(); } catch { }

    try {
      const res = await fetchWithTimeout(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: bodyToSend }),
        timeoutMs: 10000,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.error || "Error al enviar");
      // No reasignamos el valor para no borrar lo que el usuario esté escribiendo ahora.
      // El reemplazo del mensaje temporal vendrá por realtime (chat:message:new)
    } catch (e: any) {
      console.error("Error sending message:", e);
      // Restaurar el texto enviado solo si el usuario no ha empezado a escribir otra cosa
      if (!valueRef.current.trim()) {
        setValue(bodyToSend);
        try { inputRef.current?.focus(); } catch { }
      }
      try {
        const offline = typeof navigator !== "undefined" && navigator && (navigator as any).onLine === false;
        if (offline) {
          enqueueConversationMessage(conversationId, bodyToSend);
          toast.info("Mensaje en cola offline: se enviará automáticamente al reconectar.");
        }
      } catch { }
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.key === "Enter" || (e as any).keyCode === 13) && !e.shiftKey) {
      e.preventDefault();
      if (!sending) handleSend();
    }
  }

  const onChangeValue = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    // Señalizar escribiendo con throttle
    void emitTyping(true);
    // Programar apagado si no hay actividad
    try { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); } catch { }
    typingTimerRef.current = setTimeout(() => { void emitTyping(false, true); }, 3500);
  };

  // Manejar inserción de emoji
  const handleEmojiSelect = useCallback((emoji: string) => {
    setValue((prev) => prev + emoji);
    try { inputRef.current?.focus(); } catch { }
  }, []);

  useEffect(() => {
    return () => {
      try { if (typingTimerRef.current) clearTimeout(typingTimerRef.current); } catch { }
      // Best-effort: notificar que dejamos de escribir
      try { void emitTyping(false, true); } catch { }
    };
  }, [emitTyping]);

  return (
    <div className="flex items-end gap-3 p-2">
      {/* Área de input */}
      <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 shadow-sm transition-all focus-within:border-orange-300 focus-within:ring-2 focus-within:ring-orange-100 dark:focus-within:ring-orange-900/30">
        <EmojiPicker onEmojiSelect={handleEmojiSelect} disabled={sending} />
        <Textarea
          ref={inputRef}
          value={value}
          onChange={onChangeValue}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Escribe un mensaje..."
          className="flex-1 resize-none border-0 bg-transparent p-0 text-sm placeholder:text-slate-400 focus-visible:ring-0 min-h-[24px] max-h-[120px]"
        />
      </div>

      {/* Botón de enviar */}
      <Button
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleSend}
        disabled={value.trim().length < 1}
        aria-busy={sending}
        className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 p-0 shadow-md transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
      >
        <Send className={`h-4 w-4 text-white ${sending ? "animate-pulse" : ""}`} />
        <span className="sr-only">Enviar</span>
      </Button>
    </div>
  );
}

