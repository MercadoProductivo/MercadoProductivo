"use client";

import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/**
 * SiteFooter - Footer principal del sitio.
 */
export default function SiteFooter() {
  const currentYear = new Date().getFullYear();
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      try { subscription.unsubscribe(); } catch { }
    };
  }, [supabase]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <footer className="w-full bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Grid principal */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-orange-500">Mercado Productivo</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Conectamos vendedores y compradores B2B agroindustriales con transparencia y eficiencia.
            </p>
          </div>

          {/* Plataforma */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Plataforma</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-sm text-slate-300 hover:text-white transition-colors">Inicio</Link></li>
              <li><Link href="/" className="text-sm text-slate-300 hover:text-white transition-colors">Productos</Link></li>
              <li><Link href="/vendedores" className="text-sm text-slate-300 hover:text-white transition-colors">Vendedores</Link></li>
              <li><Link href="/plans" className="text-sm text-slate-300 hover:text-white transition-colors">Planes</Link></li>
            </ul>
          </div>

          {/* Soporte */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Soporte</h3>
            <ul className="space-y-2">
              <li><Link href="/contacto" className="text-sm text-slate-300 hover:text-white transition-colors">Contacto</Link></li>
              <li><Link href="/faq" className="text-sm text-slate-300 hover:text-white transition-colors">FAQ</Link></li>
              <li><Link href="/terminos" className="text-sm text-slate-300 hover:text-white transition-colors">Términos</Link></li>
              <li><Link href="/privacidad" className="text-sm text-slate-300 hover:text-white transition-colors">Privacidad</Link></li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Contacto</h3>
            <ul className="space-y-2">
              <li className="text-sm text-slate-300">📍 Buenos Aires, Argentina</li>
              <li>
                <a href="mailto:info@mercadoproductivo.com" className="text-sm text-slate-300 hover:text-white transition-colors">
                  ✉️ info@mercadoproductivo.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior con copyright y cerrar sesión */}
        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            © {currentYear} Mercado Productivo. Todos los derechos reservados.
          </p>
          {user && (
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar sesión
            </button>
          )}
        </div>
      </div>
    </footer>
  );
}
