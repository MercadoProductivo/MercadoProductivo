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

// ==========================================
// LEGACY CODE - Deprecated, kept for compatibility
// These functions reference non-existent V1 API routes
// TODO: Remove once Chat V2 is fully stable
// ==========================================

// @deprecated - V1 API removed
export async function markMessageDelivered(_id: string) {
  // V1 API /api/messages/{id}/delivered no longer exists
  // This is a no-op for Chat V2 compatibility
}

// @deprecated - V1 API removed
export async function markMessageRead(_id: string) {
  // V1 API /api/messages/{id}/read no longer exists
  // This is a no-op for Chat V2 compatibility
}

// @deprecated - V1 API removed
export async function markReplyDelivered(_id: string) {
  // V1 API /api/replies/{id}/delivered no longer exists
  // This is a no-op for Chat V2 compatibility
}

// @deprecated - V1 API removed
export async function markReplyRead(_id: string) {
  // V1 API /api/replies/{id}/read no longer exists
  // This is a no-op for Chat V2 compatibility
}

// @deprecated - Use markConversationRead for Chat V2
export async function markDeliveredAndRead(_kind: "msg" | "rep", _id: string) {
  // This is a no-op for Chat V2 compatibility
}
