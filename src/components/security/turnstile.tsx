"use client";

import React, { useEffect, useRef } from "react";

// Declaramos solo cfTurnstileOnLoad ya que turnstile viene de @marsidev/react-turnstile
declare global {
  interface Window {
    cfTurnstileOnLoad?: () => void;
  }
}

export type TurnstileProps = {
  siteKey?: string;
  theme?: "light" | "dark" | "auto";
  className?: string;
  onToken?: (token: string) => void;
  onExpire?: () => void;
};

export default function Turnstile({
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
  theme = "auto",
  className,
  onToken,
  onExpire,
}: TurnstileProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const render = () => {
      if (!containerRef.current || !siteKey) return;
      try {
        widgetIdRef.current = window.turnstile?.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size: "flexible",
          callback: (token: string) => onToken?.(token),
          "expired-callback": () => onExpire?.(),
          "error-callback": () => onExpire?.(),
        }) || null;
      } catch (e) {
        console.warn("[Turnstile] render error", e);
      }
    };

    // Si ya está disponible la API, renderizar de inmediato
    if (window.turnstile && typeof window.turnstile.render === "function") {
      render();
    } else {
      // Cargar script si no existe
      let script = document.getElementById("cf-turnstile-script") as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = "cf-turnstile-script";
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=cfTurnstileOnLoad";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      window.cfTurnstileOnLoad = () => {
        render();
      };
    }

    return () => {
      if (window.turnstile && widgetIdRef.current && typeof window.turnstile.remove === "function") {
        try { window.turnstile.remove(widgetIdRef.current); } catch { }
      }
      widgetIdRef.current = null;
    };
  }, [siteKey, theme, onToken, onExpire]);

  return <div ref={containerRef} className={className} />;
}
