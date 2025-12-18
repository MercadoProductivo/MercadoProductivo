/*
 * Service Worker para Mercado Productivo
 * Estrategia: Network-First para navegación, Cache-First para assets
 */

const CACHE_NAME = 'mp-cache-v1';
const OFFLINE_URL = '/offline.html';

// Assets a pre-cachear durante instalación
const PRECACHE_ASSETS = [
    '/',
    '/offline.html',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Instalación: pre-cachear recursos esenciales
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activación: limpiar caches antiguos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch: manejar requests según tipo
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Solo manejar GET requests
    if (request.method !== 'GET') return;

    // Ignorar requests a APIs externas y de desarrollo
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/')) return;
    if (url.pathname.startsWith('/_next/webpack-hmr')) return;

    // Navegación (HTML): Network-First con fallback a offline
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .catch(() => caches.match(OFFLINE_URL))
        );
        return;
    }

    // Assets estáticos: Cache-First, luego network
    if (request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'image' ||
        request.destination === 'font') {
        event.respondWith(
            caches.match(request)
                .then((cached) => {
                    if (cached) return cached;
                    return fetch(request).then((response) => {
                        // Solo cachear respuestas válidas
                        if (response.status === 200) {
                            const clone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                        }
                        return response;
                    });
                })
        );
    }
});
