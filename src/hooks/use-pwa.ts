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
const listeners = new Set<() => void>();

function notifyListeners() {
    listeners.forEach((fn) => fn());
}

// Registrar listener una sola vez
if (typeof window !== "undefined") {
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

export function usePWA() {
    const [canInstall, setCanInstall] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    // Detectar si ya está instalada (modo standalone)
    useEffect(() => {
        if (typeof window === "undefined") return;

        const checkInstalled = () => {
            const standalone = window.matchMedia("(display-mode: standalone)").matches;
            const iosStandalone = (navigator as any).standalone === true;
            setIsInstalled(standalone || iosStandalone);
        };

        checkInstalled();

        // Escuchar cambios de display-mode
        const mq = window.matchMedia("(display-mode: standalone)");
        mq.addEventListener("change", checkInstalled);

        return () => mq.removeEventListener("change", checkInstalled);
    }, []);

    // Sincronizar con estado global
    useEffect(() => {
        const update = () => {
            setCanInstall(globalCanInstall && !isInstalled);
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
        } catch {
            return "unavailable";
        } finally {
            setIsInstalling(false);
        }
    }, []);

    // Registrar Service Worker
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        // Solo registrar en producción o con HTTPS
        if (location.protocol === "https:" || location.hostname === "localhost") {
            navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
                // Silenciar errores de registro en desarrollo
            });
        }
    }, []);

    return {
        canInstall,
        isInstalling,
        isInstalled,
        install,
    };
}
