"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    // Loguear el error para diagnóstico (sin exponer al usuario)
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="rounded-full bg-destructive/10 p-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Algo salió mal</h1>
        <p className="max-w-md text-muted-foreground text-sm">
          Ocurrió un error inesperado en el panel. Podés intentar recargar la
          sección o volver al inicio.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            Código: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Ir al inicio
        </Button>
        <Button onClick={reset}>Reintentar</Button>
      </div>
    </div>
  );
}
