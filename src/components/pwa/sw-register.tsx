"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export default function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      console.log("[SW] Service Worker no soportado");
      toast.error("⚠️ SW no soportado en este navegador");
      return;
    }
    if ((window as any).__mpSWRegistered) return;
    (window as any).__mpSWRegistered = true;

    const registerSW = async () => {
      try {
        console.log("[SW] Registrando Service Worker...");
        toast.info("🔄 Registrando Service Worker...", { duration: 3000 });

        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.log("[SW] Registrado exitosamente:", registration.scope);

        // Si ya hay un SW activo controlando, estamos listos
        if (navigator.serviceWorker.controller) {
          console.log("[SW] Ya hay un controller activo");
          toast.success("✅ SW activo y controlando", { duration: 5000 });
          return;
        }

        // Si el SW está instalado pero no controla aún, esperar a que tome control
        if (registration.active) {
          console.log("[SW] SW activo esperando claim...");
          toast.info("⏳ SW activo, esperando control...", { duration: 3000 });
          // Forzar claim si el SW ya está activo
          registration.active.postMessage({ type: "CLAIM_CLIENTS" });
        }

        // Si hay un SW esperando (waiting), activarlo
        if (registration.waiting) {
          console.log("[SW] SW en espera, solicitando skip waiting...");
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        // Escuchar cuando el SW tome control
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          console.log("[SW] Controller cambió - SW ahora controla la página");
          toast.success("✅ SW ahora controla la página", { duration: 5000 });
        });

        // Escuchar actualizaciones
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          console.log("[SW] Nueva versión encontrada, instalando...");
          newWorker?.addEventListener("statechange", () => {
            console.log("[SW] Estado del nuevo worker:", newWorker.state);
            if (newWorker.state === "activated") {
              toast.success("✅ Nueva versión del SW activada", { duration: 5000 });
            }
          });
        });

        // Si después de 3 segundos aún no hay controller, notificar
        setTimeout(() => {
          if (!navigator.serviceWorker.controller) {
            toast.warning("⚠️ SW registrado pero no controla. Recarga la página.", { duration: 8000 });
          }
        }, 3000);

      } catch (err) {
        console.error("[SW] Error al registrar:", err);
        toast.error(`❌ Error SW: ${String(err)}`, { duration: 10000 });
      }
    };

    registerSW();
  }, []);
  return null;
}
