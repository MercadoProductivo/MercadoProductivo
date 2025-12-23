"use client";
import React, { useEffect, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { normalizeAvatarUrl, initialFrom, avatarAltIncoming, avatarAltOutgoing } from "@/lib/user-display";
import { MessageStatus, getMessageStatus } from "./message-status";

export type ChatItem = {
  id: string;
  type: "incoming" | "outgoing";
  message_id?: string;
  body: string;
  created_at: string;
  sender_name?: string;
  sender_email?: string;
  delivery_status?: "sending" | "sent" | "delivered" | "read" | "failed";
  delivered_at?: string | null;
  read_at?: string | null;
  sending?: boolean;
  failed?: boolean;
  avatar_url?: string;
};

export default function ChatMessages({ items, lastReadAt }: { items: ChatItem[]; lastReadAt?: string }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      bottomRef.current?.scrollIntoView({ block: "end", inline: "nearest", behavior: "smooth" });
    } catch { }
  }, [items]);

  const lastReadAtMs = useMemo(() => (lastReadAt ? new Date(lastReadAt).getTime() : null), [lastReadAt]);

  const lastOutgoingReadId = useMemo(() => {
    if (!lastReadAtMs) return null as string | null;
    let id: string | null = null;
    for (const it of items) {
      if (it.type === "outgoing") {
        const t = new Date(it.created_at).getTime();
        if (t <= lastReadAtMs) id = it.id;
      }
    }
    return id;
  }, [items, lastReadAtMs]);

  return (
    <div className="flex flex-col gap-3 px-2 py-4">
      {items.map((it, idx) => {
        const currDate = new Date(it.created_at);
        const currKey = `${currDate.getFullYear()}-${currDate.getMonth()}-${currDate.getDate()}`;
        const prev = items[idx - 1];
        const showDateDivider = (() => {
          if (!prev) return true;
          try {
            const d = new Date(prev.created_at);
            const prevKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
            return prevKey !== currKey;
          } catch {
            return false;
          }
        })();

        // Agrupar mensajes consecutivos del mismo remitente
        const isConsecutive = prev && prev.type === it.type && !showDateDivider;
        const initial = initialFrom(it.sender_name, it.sender_email);

        return (
          <div
            key={it.id}
            className={cn(
              "flex w-full flex-col animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
              isConsecutive ? "mt-0.5" : "mt-2"
            )}
          >
            {/* Divisor de fecha */}
            {showDateDivider && (
              <div className="my-4 flex items-center justify-center gap-3">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/80 px-4 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {currDate.toLocaleDateString("es-AR", { weekday: "short", day: "2-digit", month: "short" })}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              </div>
            )}

            {/* Mensaje */}
            <div className={cn(
              "flex w-full items-end gap-2.5 group",
              it.type === "incoming" ? "justify-start" : "justify-end"
            )}>
              {/* Avatar entrante */}
              {it.type === "incoming" && !isConsecutive && (
                <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm transition-transform group-hover:scale-105">
                  <AvatarImage src={normalizeAvatarUrl(it.avatar_url)} alt={avatarAltIncoming(it.sender_name, it.sender_email)} />
                  <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 text-xs font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
              )}
              {it.type === "incoming" && isConsecutive && <div className="w-8" />}

              {/* Burbuja de mensaje */}
              <div
                className={cn(
                  "relative max-w-[75%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed transition-all duration-200",
                  "shadow-sm hover:shadow-md",
                  it.type === "incoming"
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-700 rounded-bl-md"
                    : "bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-md",
                  it.sending && "opacity-70"
                )}
                title={new Date(it.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
              >
                {/* Nombre del remitente (solo para entrantes y no consecutivos) */}
                {it.type === "incoming" && it.sender_name && !isConsecutive && (
                  <div className="mb-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                    {it.sender_name}
                  </div>
                )}

                {/* Cuerpo del mensaje */}
                <div className="whitespace-pre-wrap break-words">{it.body}</div>

                {/* Timestamp y status */}
                <div className={cn(
                  "mt-1.5 flex items-center justify-end gap-1.5 text-[10px]",
                  it.type === "incoming"
                    ? "text-slate-400 dark:text-slate-500"
                    : "text-white/70"
                )}>
                  <span>
                    {new Date(it.created_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {it.type === "outgoing" && (() => {
                    let computedStatus = it.delivery_status || getMessageStatus(it);
                    if (lastReadAtMs && computedStatus !== "failed" && computedStatus !== "sending") {
                      const msgTime = new Date(it.created_at).getTime();
                      if (msgTime <= lastReadAtMs) {
                        computedStatus = "read";
                      }
                    }
                    return (
                      <MessageStatus
                        status={computedStatus}
                        className="ml-0.5"
                      />
                    );
                  })()}
                </div>
              </div>

              {/* Avatar saliente */}
              {it.type === "outgoing" && !isConsecutive && (
                <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm transition-transform group-hover:scale-105">
                  <AvatarImage src={normalizeAvatarUrl(it.avatar_url)} alt={avatarAltOutgoing(it.sender_name, it.sender_email)} />
                  <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-semibold">
                    {initialFrom(it.sender_name, it.sender_email)}
                  </AvatarFallback>
                </Avatar>
              )}
              {it.type === "outgoing" && isConsecutive && <div className="w-8" />}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
