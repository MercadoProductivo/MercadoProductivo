"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Fuerza scroll al tope en cada cambio de ruta o query.
 * Incluye fallbacks para distintos contenedores de scroll y espera al frame de render.
 */
export default function ScrollToTop() {
  const pathname = usePathname();
  const search = useSearchParams();

  // Desactivar restauración del navegador (back/forward)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.history.scrollRestoration = "manual";
    } catch {}
  }, []);

  // Ir al tope cuando cambia la ruta o los query params
  useEffect(() => {
    if (typeof window === "undefined") return;

    const doScrollTop = () => {
      try {
        // Scroll principal de la ventana
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        // Fallbacks específicos
        const el = document.scrollingElement || document.documentElement;
        if (el) el.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
        // Si el contenido usa un main con overflow, también lo reseteamos
        const main = document.querySelector("main");
        if (main instanceof HTMLElement) {
          main.scrollTop = 0;
        }
      } catch {}
    };

    // Ejecutar ahora y reintentar en frames/tiempos posteriores para vencer restauraciones automáticas
    doScrollTop();
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => {
        doScrollTop();
        requestAnimationFrame(() => doScrollTop());
      });
    }
    setTimeout(doScrollTop, 0);
    setTimeout(doScrollTop, 50);
    setTimeout(doScrollTop, 200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search?.toString()]);

  return null;
}
