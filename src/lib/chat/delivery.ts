// Chat v2: marcar conversación como leída
export async function markConversationRead(conversationId: string) {
  try {
    await fetch(`/api/chat/conversations/${encodeURIComponent(conversationId)}/read`, {
      method: "POST",
      cache: "no-store",
    });
  } catch {
    // Non-critical: swallow errors
  }
}

// Chat v2: marcar conversación como oculta
export async function hideConversation(conversationId: string) {
  try {
    await fetch(`/api/chat/conversations/${encodeURIComponent(conversationId)}/hide`, {
      method: "POST",
      cache: "no-store",
    });
  } catch {
    // Non-critical: swallow errors
  }
}

// Chat v2: restaurar conversación oculta
export async function restoreConversation(conversationId: string) {
  try {
    await fetch(`/api/chat/conversations/${encodeURIComponent(conversationId)}/hide`, {
      method: "DELETE",
      cache: "no-store",
    });
  } catch {
    // Non-critical: swallow errors
  }
}
