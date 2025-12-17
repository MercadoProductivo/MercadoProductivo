# Documentación Técnica del Sistema de Chat

## Resumen

El sistema de chat de MercadoProductivo utiliza **Pusher** para comunicación en tiempo real bidireccional. Esta documentación describe los flujos de datos, componentes y configuración necesaria.

---

## Arquitectura

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Cliente A     │     │     Pusher      │     │   Cliente B     │
│  (Next.js)      │────▶│   (WebSocket)   │◀────│   (Next.js)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌─────────────────┐              │
         └─────────────▶│   API Server    │◀─────────────┘
                        │   (Next.js)     │
                        └────────┬────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   Supabase DB   │
                        └─────────────────┘
```

---

## Flujos Principales

### 1. Envío de Mensaje

```
Cliente → POST /api/chat/conversations/{id}/messages
       → Insert en chat_messages
       → Trigger Pusher: chat:message:new
       → Destinatario recibe evento en real-time
```

### 2. Estado de Presencia

```
Cliente → Heartbeat cada 30s → POST /api/chat/presence/heartbeat
       → Upsert en user_presence (is_online=true)
       → Al cerrar pestaña: DELETE /api/chat/presence/heartbeat
       → user_presence.is_online = false
```

### 3. Confirmación de Lectura

```
Cliente abre conversación → POST /api/chat/conversations/{id}/read
                         → Update chat_conversation_members.last_read_at
                         → Update chat_messages.read_at
                         → Trigger Pusher: chat:messages:read
                         → Remitente recibe ✓✓
```

---

## Canales Pusher

| Canal | Tipo | Eventos |
|-------|------|---------|
| `private-conversation-{id}` | Privado | `chat:message:new`, `chat:typing`, `chat:read` |
| `private-user-{userId}` | Privado | `chat:conversation:new`, `chat:message:new` |

---

## Componentes

### Proveedores
- `ChatProvider` - Contexto principal, inicializa Pusher y notificaciones

### Hooks
| Hook | Función |
|------|---------|
| `usePusherSubscription` | Suscripción a canales con retry |
| `useChatTimeline` | Estado de mensajes, paginación |
| `useUserPresence` | Heartbeat automático |
| `useChatNotifications` | Sonido, browser notifications |

### UI
| Componente | Función |
|------------|---------|
| `ConnectionIndicator` | 🟢/🟡/🔴 estado conexión |
| `PresenceIndicator` | Online/offline usuario |
| `MessageStatus` | ✓/✓✓ checkmarks |
| `NotificationSettings` | Configuración notificaciones |

---

## Codificación UTF-8

Todos los mensajes se procesan con codificación UTF-8:

1. **Frontend**: JavaScript usa UTF-16 internamente, conversión automática
2. **API**: Headers `Content-Type: application/json; charset=utf-8`
3. **Database**: Supabase PostgreSQL con `LC_COLLATE = 'en_US.UTF-8'`
4. **WebSocket**: Pusher transmite texto como UTF-8

No se requiere configuración adicional para caracteres especiales (tildes, ñ, etc.).

---

## Configuración Requerida

### Variables de Entorno

```bash
# Pusher (Client)
NEXT_PUBLIC_PUSHER_KEY=your_pusher_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster

# Pusher (Server)
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_pusher_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster

# Feature Flag
FEATURE_CHAT_V2_ENABLED=true
```

### Migraciones SQL

Ejecutar en orden en Supabase SQL Editor:

1. `scripts/fix_chat_members_fk.sql`
2. `scripts/fix_chat_messages_fk.sql`
3. `scripts/optimization_chat_v2.sql`
4. `scripts/add_user_presence.sql`
5. `scripts/add_message_status.sql`

---

## Logging y Diagnóstico

### Chat Logger

El sistema incluye un logger estructurado accesible desde la consola del navegador:

```javascript
// Ver historial de logs
__chatLogger.getHistory()

// Exportar logs como JSON
__chatLogger.exportLogs()

// Habilitar modo debug
localStorage.setItem('chat_debug', 'true')
```

### Eventos Registrados

- `connection` - Cambios de estado de conexión
- `message` - Envío/recepción de mensajes
- `subscription` - Suscripción/error en canales
- `presence` - Heartbeats y estado online

---

## Seguridad

- Canales privados requieren autenticación via `/api/pusher/auth`
- RLS (Row Level Security) en todas las tablas
- Rate limiting en endpoints sensibles
- No se exponen secrets del servidor al cliente

---

## Compatibilidad

| Navegador | Mínimo |
|-----------|--------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 13+ |
| Edge | 80+ |
