"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import confirmModal from "@/components/ui/confirm-modal";
import { toast } from "sonner";

export default function UpgradeToSellerButton({
  className,
  children,
  confirmTitle = "Cambiar a Vendedor",
  confirmDescription = "Al cambiar a vendedor podrás publicar productos y servicios, y acceder a más herramientas. ¿Deseás continuar?",
  confirmText = "Cambiar a vendedor",
  cancelText = "Cancelar",
}: {
  className?: string;
  children?: React.ReactNode;
  confirmTitle?: string;
  confirmDescription?: string;
  confirmText?: string;
  cancelText?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      const ok = await confirmModal({
        title: confirmTitle,
        description: confirmDescription,
        confirmText,
        cancelText,
      });
      if (!ok) return;
      setLoading(true);
      const res = await fetch("/api/profile/upgrade-to-seller", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || j?.message || "No se pudo actualizar el rol");
      toast.success("¡Listo! Ahora sos vendedor");
      router.push("/dashboard");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "Error al cambiar a vendedor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={onClick} className={className} disabled={loading}>
      {children ?? (loading ? "Cambiando..." : "Cambiar a vendedor")}
    </Button>
  );
}
