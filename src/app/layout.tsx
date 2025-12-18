import { SpeedInsights } from "@vercel/speed-insights/next"

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import AppShell from "@/components/layout/app-shell";
import GlobalMobileMenu from "@/components/layout/global-mobile-menu";
import { createClient } from "@/lib/supabase/server";
import { normalizeRoleFromMetadata } from "@/lib/auth/role";
import NotificationsProvider from "@/providers/notifications-provider";

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
};

export const viewport: Viewport = {
  themeColor: "#f06d04",
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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const initialIsSeller = !!(user && normalizeRoleFromMetadata(user.user_metadata || {}) === "seller");
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`antialiased ${inter.className} w-full bg-background text-foreground`}>
        <SpeedInsights />
        <ThemeProvider>
          <NotificationsProvider>
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
