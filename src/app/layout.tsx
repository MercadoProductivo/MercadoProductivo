import { SpeedInsights } from "@vercel/speed-insights/next"

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";
import Script from "next/script";
import { ThemeProvider } from "@/components/theme-provider";
import AppShell from "@/components/layout/app-shell";
import GlobalMobileMenu from "@/components/layout/global-mobile-menu";
import { createClient } from "@/lib/supabase/server";
import { normalizeRoleFromMetadata } from "@/lib/auth/role";
import NotificationsProvider from "@/providers/notifications-provider";
import SWRegister from "@/components/pwa/sw-register";

export const metadata: Metadata = {
  title: {
    default: "Mercado Productivo",
    template: "%s | Mercado Productivo"
  },
  description: "Plataforma que conecta vendedores con compradores",
  manifest: "/manifest.webmanifest",
  themeColor: "#f06d04",
  icons: {
    icon: [
      { url: "/mp-logo.svg", type: "image/svg+xml" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/mp-logo.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
    shortcut: "/mp-logo.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mercado Productivo",
  },
  openGraph: {
    type: "website",
    title: "Mercado Productivo",
    description: "Plataforma que conecta vendedores con compradores",
    siteName: "Mercado Productivo",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mercado Productivo",
    description: "Plataforma que conecta vendedores con compradores",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const inter = Inter({ subsets: ["latin"] });

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Calcular rol del usuario en el servidor para evitar parpadeos en móvil
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const initialIsSeller = !!(user && normalizeRoleFromMetadata(user.user_metadata || {}) === "seller");
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`antialiased ${inter.className} w-full bg-background text-foreground`}>
        <SpeedInsights />
        {/* Captura temprana del evento beforeinstallprompt ANTES de la hidratación de React */}
        <Script id="mp-bip-capture" strategy="beforeInteractive">
          {`
            (function(){
              try {
                if (typeof window === 'undefined') return;
                if (window.__mpBIPAttached) return; // evitar listeners duplicados
                window.__mpBIPAttached = true;
                window.__mpDefer = null;
                window.addEventListener('beforeinstallprompt', function(e){
                  try { e.preventDefault(); } catch(_){ }
                  try { window.__mpDefer = e; } catch(_){ }
                  try { window.dispatchEvent(new CustomEvent('mp:bip-ready')); } catch(_){ }
                });
              } catch {}
            })();
          `}
        </Script>
        {/* Registro del Service Worker lo antes posible */}
        <Script id="mp-sw-register" strategy="beforeInteractive">
          {`
            (function(){
              try {
                if (!('serviceWorker' in navigator)) return;
                if (window.__mpSWRegistered) return;
                window.__mpSWRegistered = true;
                try { navigator.serviceWorker.register('/sw.js', { scope: '/' }); } catch {}
              } catch {}
            })();
          `}
        </Script>
        <ThemeProvider>
          <NotificationsProvider>
            {/* Registro SW de respaldo en cliente (por si el Script temprano no corre en prod) */}
            <SWRegister />
            <AppShell>
              {children}
              <GlobalMobileMenu initialIsSeller={initialIsSeller} />
            </AppShell>
            {/* Toaster mobile: arriba a la derecha, con offset para no tapar el header */}
            <div className="sm:hidden">
              <Toaster richColors theme="light" position="top-right" offset={96} />
            </div>
            {/* Toaster desktop: abajo a la derecha */}
            <div className="hidden sm:block">
              <Toaster richColors theme="light" position="bottom-right" offset={24} />
            </div>
          </NotificationsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
