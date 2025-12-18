/*
  Service Worker PWA básico para Mercado Productivo
  Estrategias:
  - Navegaciones (HTML): network-first con timeout -> offline.html
  - Assets estáticos (css, js, imágenes, fuentes): stale-while-revalidate
*/

const CACHE_PREFIX = 'mp-pwa-v3';
const STATIC_CACHE = CACHE_PREFIX + '-static';

const APP_SHELL = [
  '/',
  '/offline.html',
];

function fetchWithTimeout(req, ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return fetch(req, { signal: controller.signal }).finally(() => clearTimeout(t));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(APP_SHELL);
      } catch { }
      try { await self.skipWaiting(); } catch { }
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(
          keys
            .filter((k) => k.startsWith(CACHE_PREFIX) && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        );
      } catch { }
      // Tomar control de todos los clientes inmediatamente
      try { await self.clients.claim(); } catch { }
      console.log('[SW] Activado y controlando clientes');
    })()
  );
});

// Escuchar mensajes para forzar activación
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    console.log('[SW] Recibido SKIP_WAITING');
    self.skipWaiting();
  }
  if (event.data?.type === 'CLAIM_CLIENTS') {
    console.log('[SW] Recibido CLAIM_CLIENTS');
    self.clients.claim();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // Navegaciones: preferir red, con timeout -> offline
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetchWithTimeout(request, 6000);
          return res;
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          const cached = await cache.match('/offline.html');
          return cached || new Response('Sin conexión', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        }
      })()
    );
    return;
  }

  // Assets: stale-while-revalidate
  const accept = request.headers.get('accept') || '';
  const isAsset = /\b(text\/css|application\/javascript|font\/|image\/)\b/.test(accept);
  if (isAsset) {
    const url = new URL(request.url);
    // Evitar interceptar assets cross-origin para no romper con errores de red
    if (url.origin !== self.location.origin) return;
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        try {
          const res = await fetch(request);
          try { cache.put(request, res.clone()); } catch { }
          return res;
        } catch {
          // Siempre devolver un Response válido
          return cached || new Response('', { status: 504 });
        }
      })()
    );
  }
});
