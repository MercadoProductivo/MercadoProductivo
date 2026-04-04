"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Intercepta TODOS los intentos de navegación cuando `enabled = true`.
 *
 * Cubre tres vectores:
 * 1. `beforeunload`  → Cierre de pestaña / refresh → dialog nativo del browser
 * 2. Click en `<a>` → Links de Next.js / menú de navegación → llama `onAttempt`
 * 3. `popstate`      → Botón Atrás / Adelante del browser → llama `onAttempt`
 */
export function useNavigationGuard({
  enabled,
  onAttempt,
}: {
  /** Activar el guard (solo cuando hay cambios sin guardar) */
  enabled: boolean;
  /** Llamado con una función `proceed` que ejecutará la navegación si el usuario confirma */
  onAttempt: (proceed: () => void) => void;
}) {
  const enabledRef    = useRef(enabled);
  const onAttemptRef  = useRef(onAttempt);
  const router        = useRouter();
  const routerRef     = useRef(router);

  // Mantener refs actualizadas sin re-crear los event listeners
  useEffect(() => { enabledRef.current   = enabled;    }, [enabled]);
  useEffect(() => { onAttemptRef.current = onAttempt;  }, [onAttempt]);
  useEffect(() => { routerRef.current    = router;     }, [router]);

  useEffect(() => {
    // Guardar la URL actual de la página al montar
    const pageUrl = window.location.href;

    // ── 1. beforeunload ──────────────────────────────────────────────────────
    // Se dispara al cerrar pestaña, cerrar el browser, o hacer F5/Ctrl+R
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!enabledRef.current) return;
      e.preventDefault();
      // Chrome/Edge requieren esta asignación para mostrar el cuadro nativo
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // ── 2. Interceptor de clicks en enlaces ──────────────────────────────────
    // Next.js renderiza <Link> como <a href>, así que interceptamos todos los
    // clicks a nivel document en modo capture para atraparlos antes que Next.js.
    const handleAnchorClick = (e: MouseEvent) => {
      if (!enabledRef.current) return;

      // Buscar el <a> más cercano al elemento clickeado
      const anchor = (e.target as Element).closest<HTMLAnchorElement>("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href") ?? "";

      // No bloquear: links externos, hash-links, mailto, tel
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        /^https?:\/\//.test(href)
      ) return;

      // Bloquear la navegación y mostrar el dialog
      e.preventDefault();
      e.stopImmediatePropagation();

      const destination = href;
      onAttemptRef.current(() => routerRef.current.push(destination));
    };

    // true = capture phase: lo atrapamos antes que el handler de Next.js
    document.addEventListener("click", handleAnchorClick, true);

    // ── 3. Botón Atrás / Adelante del browser ────────────────────────────────
    // Pusheamos un estado extra para poder interceptar el `popstate`
    history.pushState({ __navGuard: true }, "", pageUrl);

    const handlePopState = () => {
      // window.location.href ya cambió al destino cuando se dispara popstate
      const destinationUrl = window.location.href;

      // Volvemos a pushear la página actual para "frenar" la salida
      history.pushState({ __navGuard: true }, "", pageUrl);

      if (!enabledRef.current) {
        // Sin cambios → navegar sin dialog (full-reload para salir del guard state)
        window.location.href = destinationUrl;
        return;
      }

      onAttemptRef.current(() => {
        // Hard-navigate: salimos del guard state y llegamos al destino
        window.location.href = destinationUrl;
      });
    };

    window.addEventListener("popstate", handlePopState);

    // Cleanup al desmontar el componente
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleAnchorClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []); // Solo una vez al montar — los valores actuales se leen desde refs
}
