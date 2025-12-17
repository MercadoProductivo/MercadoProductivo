/** @type {import('next').NextConfig} */
const path = require('path');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHostname = undefined;
try {
  if (SUPABASE_URL) {
    supabaseHostname = new URL(SUPABASE_URL).hostname;
  }
} catch { }

const nextConfig = {
  reactStrictMode: true,
  // Validaciones de lint y TypeScript habilitadas en build para mayor seguridad
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  // Exponer envs públicos al cliente en tiempo de build
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  images: {
    remotePatterns: [
      // Hostname dinámico desde la URL del proyecto Supabase (recomendado)
      ...(supabaseHostname
        ? [{ protocol: 'https', hostname: supabaseHostname, pathname: '/storage/v1/object/public/**' }]
        : []),
      // Permitir cualquier proyecto de Supabase (útil si cambian entornos)
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
      // Fallback explícito por si se utiliza otro proyecto localmente
      { protocol: 'https', hostname: 'xsgcscgdzbhiphgyzbfm.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
    ],
  },
  webpack: (config) => {
    // Configurar alias para rutas absolutas
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
  async headers() {
    // Lista de orígenes permitidos
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      'http://localhost:3000',
      'http://localhost:3005',
      'https://mercadoproductivo.vercel.app',
    ].filter(Boolean);

    return [
      // CORS restrictivo para endpoints públicos de API
      {
        source: '/api/public/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowedOrigins.join(',') },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      // Sin CORS para endpoints sensibles - solo same-origin
      {
        source: '/api/(billing|webhooks|chat|messages)/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      // CORS permisivo solo para Pusher auth (necesita credenciales)
      {
        source: '/api/pusher/auth',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: allowedOrigins[0] || 'http://localhost:3005' },
          { key: 'Access-Control-Allow-Methods', value: 'POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      // Content Security Policy - Report-Only Mode (Monitoreo sin bloquear)
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.pusher.com https://cdn.vercel-insights.com https://va.vercel-scripts.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://plus.unsplash.com https://via.placeholder.com",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co wss://*.pusher.com https://*.pusher.com https://api.mercadopago.com https://vitals.vercel-insights.com https://apis.datos.gob.ar https://va.vercel-scripts.com",
              "frame-src 'self' https://www.mercadopago.com https://challenges.cloudflare.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; ')
          }
        ]
      },
    ];
  },
  // Las Server Actions están habilitadas por defecto en Next.js 14+
};

module.exports = nextConfig;
