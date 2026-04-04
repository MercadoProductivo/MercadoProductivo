"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import confirmModal from "@/components/ui/confirm-modal";

type CancelSubscriptionButtonProps = {
  disabled?: boolean;
  renewsAt?: string | null;
};

function formatDateShort(d?: string | null) {
  if (!d) return null;
  try {
    return new Date(d).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export default function CancelSubscriptionButton({ disabled, renewsAt }: CancelSubscriptionButtonProps) {
  const [loading, setLoading] = useState<"none" | "end">("none");

  const callCancel = async (mode: "at_period_end") => {
    setLoading("end");
    try {
      const res = await fetch("/api/billing/mp/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json().catch(() => ({} as any));
      if (res.ok) {
        const mpOk = data?.cancelled !== false;
        const suffix = mpOk ? "" : "&mp=0";
        window.location.assign(`/dashboard/plan?cancel=1${suffix}`);
        return;
      }
      alert(`Error al cancelar: ${data?.error || res.statusText}`);
    } catch (e: any) {
      alert(`Error al cancelar: ${e?.message || "Unknown"}`);
    } finally {
      setLoading("none");
    }
  };

  const onCancelAtEnd = async () => {
    const renewsDateFmt = formatDateShort(renewsAt);
    const description = renewsDateFmt
      ? `Tu suscripción se cancelará el ${renewsDateFmt}. Hasta entonces conservarás todos los beneficios de tu plan actual. El plan pasará a Básico (gratuito) automáticamente. ¿Querés continuar?`
      : "Se cancelará la suscripción y el plan cambiará a Básico al finalizar tu ciclo actual. ¿Querés continuar?";

    const ok = await confirmModal({
      title: "Cancelar suscripción",
      description,
      confirmText: "Sí, cancelar al fin de ciclo",
      cancelText: "No, volver",
      variant: "destructive",
    });
    if (!ok) return;
    await callCancel("at_period_end");
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
      onClick={onCancelAtEnd}
      disabled={disabled || loading !== "none"}
    >
      {loading === "end" ? "Cancelando..." : "Cancelar suscripción"}
    </Button>
  );
}
