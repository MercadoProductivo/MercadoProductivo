"use client";

import { useEffect, useState, useCallback } from "react";

// Tipado para el evento beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Estado global para compartir entre componentes
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let globalCanInstall = false;
let listenerRegistered = false;
const listeners = new Set<() => void>();

function notifyListeners() {
    listeners.forEach((fn) => fn());
}

// Registrar listener una sola vez (en módulo, no en componente)
function registerGlobalListeners() {
    if (typeof window === "undefined" || listenerRegistered) return;
    listenerRegistered = true;



    window.addEventListener("beforeinstallprompt", (e) => {

        e.preventDefault();
        deferredPrompt = e as BeforeInstallPromptEvent;
        globalCanInstall = true;
        notifyListeners();
    });

    window.addEventListener("appinstalled", () => {

        deferredPrompt = null;
        globalCanInstall = false;
        notifyListeners();
    });
}

// Llamar inmediatamente
registerGlobalListeners();

/**
 * Detecta si la PWA está REALMENTE instalada.
 * Evita falsos positivos de display-mode: standalone en Chrome Android.
 */
async function checkReallyInstalled(): Promise<boolean> {
    if (typeof window === "undefined") return false;

    // 1. iOS Safari: usar navigator.standalone
    if ((navigator as any).standalone === true) {

        return true;
    }

    // 2. Si estamos en un WebView o app instalada real (display-mode funciona bien aquí)
    // Pero SOLO confiar si NO estamos en Chrome Android normal
    const isRunningStandalone = window.matchMedia("(display-mode: standalone)").matches;

    if (isRunningStandalone) {
        // Verificar si realmente estamos en modo PWA
        // En Chrome Android, el user agent incluye "wv" para WebView
        const ua = navigator.userAgent;
        const isAndroidWebView = /; wv\)/.test(ua);
        const isTWA = /\bTWA\b/.test(ua); // Trusted Web Activity

        // Si estamos en standalone Y en WebView/TWA, es instalada real
        if (isAndroidWebView || isTWA) {

            return true;
        }

        // Para otros navegadores (Edge, Samsung Internet), confiar en display-mode
        const isChrome = /Chrome/.test(ua) && !/Edg|Samsung/.test(ua);
        if (!isChrome) {

            return true;
        }

        // En Chrome Android, display-mode puede dar falso positivo
        // NO confiar ciegamente, verificar con otros indicadores

    }

    // 3. Fallback: si llegamos aquí, asumir NO instalada
    return false;
}

export function usePWA() {
    const [canInstall, setCanInstall] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Detectar si ya está instalada
    useEffect(() => {
        if (typeof window === "undefined") return;

        const check = async () => {
            const installed = await checkReallyInstalled();

            setIsInstalled(installed);
            setIsLoading(false);
        };

        check();

        // Escuchar cambios de display-mode
        const mq = window.matchMedia("(display-mode: standalone)");
        const onChange = () => check();
        mq.addEventListener("change", onChange);

        return () => mq.removeEventListener("change", onChange);
    }, []);

    // Sincronizar con estado global
    useEffect(() => {
        const update = () => {
            const available = globalCanInstall && !isInstalled;

            setCanInstall(available);
        };

        update();
        listeners.add(update);

        return () => {
            listeners.delete(update);
        };
    }, [isInstalled]);

    // Función de instalación
    const install = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
        if (!deferredPrompt) {

            return "unavailable";
        }

        setIsInstalling(true);

        try {

            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;


            if (outcome === "accepted") {
                deferredPrompt = null;
                globalCanInstall = false;
                setCanInstall(false);
                notifyListeners();
            }

            return outcome;
        } catch (err) {
            console.error("[PWA] Error en install():", err);
            return "unavailable";
        } finally {
            setIsInstalling(false);
        }
    }, []);

    // Registrar Service Worker
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        // Solo registrar en producción o con HTTPS/localhost
        if (location.protocol === "https:" || location.hostname === "localhost") {
            navigator.serviceWorker.register("/sw.js", { scope: "/" })
                .then((reg) => { }) // SW registrado con éxito
                .catch((err) => console.warn("[PWA] Error registrando SW:", err));
        }
    }, []);

    return {
        canInstall,
        isInstalling,
        isInstalled,
        isLoading,
        install,
        // Exponer para diagnóstico
        hasDeferredPrompt: () => deferredPrompt !== null,
    };
}
