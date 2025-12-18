"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// sin toasts en el hook: la UI decide qué mostrar

// Estado global compartido entre instancias para evitar que un componente "consuma"
// el evento y otro no pueda usarlo. De este modo, botón del header y botón del menú
// comparten el mismo deferredPrompt y el mismo flag canInstall.
let deferredPromptGlobal: BeforeInstallPromptEvent | null = null;
let canInstallGlobal = false;
let isStandaloneGlobal = false;
let listenersAttached = false;
const subscribers = new Set<(state: { canInstall: boolean; isStandalone: boolean }) => void>();

function notifyAll() {
  const snapshot = { canInstall: canInstallGlobal, isStandalone: isStandaloneGlobal };
  subscribers.forEach((fn) => {
    try { fn(snapshot); } catch { }
  });
}

export function usePWAInstall() {
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Limpia claves antiguas que pudieran bloquear instalaciones de versiones previas
    try { localStorage.removeItem('pwa-install-dismissed'); } catch { }

    const modeStandalone = () => {
      try {
        return (
          window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
        ) || (navigator as any).standalone === true;
      } catch {
        return false;
      }
    };
    isStandaloneGlobal = modeStandalone();
    setIsStandalone(isStandaloneGlobal);

    // Tomar evento capturado tempranamente
    try {
      const w = window as any;
      if (w.__mpDefer && !deferredPromptGlobal) {
        deferredPromptGlobal = w.__mpDefer as BeforeInstallPromptEvent;
        canInstallGlobal = true;
        notifyAll();
      }
    } catch { }

    // Adjuntar listeners globales solo una vez
    if (!listenersAttached) {
      const onBefore = (e: BeforeInstallPromptEvent) => {
        e.preventDefault();
        deferredPromptGlobal = e;
        canInstallGlobal = true;
        notifyAll();
      };

      const onInstalled = () => {
        canInstallGlobal = false;
        deferredPromptGlobal = null;
        isStandaloneGlobal = true;
        notifyAll();
      };

      window.addEventListener('beforeinstallprompt', onBefore as any);
      window.addEventListener('appinstalled', onInstalled);

      // Evento personalizado desde layout.tsx
      window.addEventListener('mp:bip-ready', (() => {
        const w = window as any;
        if (w.__mpDefer) {
          deferredPromptGlobal = w.__mpDefer;
          canInstallGlobal = true;
          notifyAll();
        }
      }) as any);

      listenersAttached = true;
    }

    // Suscribirse a cambios globales y sincronizar estado local
    const sub = (s: { canInstall: boolean; isStandalone: boolean }) => {
      setCanInstall(s.canInstall);
      setIsStandalone(s.isStandalone);
      deferredRef.current = deferredPromptGlobal;
    };
    subscribers.add(sub);

    // Estado inicial sincronizado
    setCanInstall(canInstallGlobal);
    setIsStandalone(isStandaloneGlobal);
    deferredRef.current = deferredPromptGlobal;

    return () => {
      subscribers.delete(sub);
    };
  }, []);

  const install = async () => {
    let e = deferredPromptGlobal || deferredRef.current;

    if (!e) {
      // Intento final de recuperar del window
      try {
        const w = window as any;
        if (w.__mpDefer) {
          e = w.__mpDefer;
          deferredPromptGlobal = e;
        }
      } catch { }
    }

    if (e) {
      try {
        await e.prompt();
        const res = await e.userChoice;
        if (res?.outcome === 'accepted') {
          canInstallGlobal = false;
          deferredPromptGlobal = null;
          isStandaloneGlobal = true;
          notifyAll();
        }
        return res?.outcome;
      } catch (err) {
        console.error("[PWA] Install error:", err);
        return 'error';
      }
    }

    if (isIOS && !isStandalone) {
      return 'ios-instructions';
    }

    return 'unavailable';
  };

  return { canInstall, install, isIOS, isStandalone };
}
