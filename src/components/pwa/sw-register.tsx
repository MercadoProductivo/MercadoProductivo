"use client";

import { useEffect } from "react";

export default function SWRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if ((window as any).__mpSWRegistered) return;
    (window as any).__mpSWRegistered = true;
    try {
      navigator.serviceWorker.register("/sw.js", { scope: "/" });
    } catch {}
  }, []);
  return null;
}
