import { SpeedInsights } from "@vercel/speed-insights/next"

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import AppShell from "@/components/layout/app-shell";
import GlobalMobileMenu from "@/components/layout/global-mobile-menu";
import NotificationsProvider from "@/providers/notifications-provider";
import { QueryProvider } from "@/providers/query-provider";

export const metadata: Metadata = {
  title: {
    default: "Mercado Productivo",
    template: "%s | Mercado Productivo"
  },
  description: "Plataforma que conecta vendedores con compradores",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mercado Productivo",
  },
  icons: {
    icon: [
      { url: "/mp-logo.svg?v=20251026", type: "image/svg+xml" },
      { url: "/icon.svg?v=20251026", type: "image/svg+xml" },
      { url: "/favicon.svg?v=20251026", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
    shortcut: "/mp-logo.svg?v=20251026",
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
  // Migrado desde head.tsx (Pages Router) — compatibilidad Android PWA
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#f06d04",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });


export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Layout raíz estático (sin bloqueo de auth)
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`antialiased ${jakarta.className} w-full bg-background text-foreground`}>
        <SpeedInsights />
        <QueryProvider>
          <ThemeProvider>
            <NotificationsProvider>
              <AppShell>
                <>
                  {children}
                  <GlobalMobileMenu />
                </>
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
        </QueryProvider>
      </body>
    </html>
  );
}
