"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type ContactFormButtonProps = {
  sellerPlanCode?: string | null;
  sellerId: string;
  sellerName?: string | null;
  productTitle?: string | null;
  currentUserName?: string | null;
  currentUserEmail?: string | null;
  currentUserPhone?: string | null;
  size?: "sm" | "md";
  className?: string;
  buttonLabel?: string;
  onSubmitted?: (payload: {
    nombre: string;
    email: string;
    telefono: string;
    asunto: string;
    mensaje: string;
    sellerId: string;
  }) => void;
};

export default function ContactFormButton({
  sellerId,
  sellerName,
  productTitle,
  currentUserName,
  currentUserEmail,
  currentUserPhone,
  size = "sm",
  className,
  buttonLabel = "Enviar formulario",
  onSubmitted,
}: ContactFormButtonProps) {
  const triggerSize = size === "sm" ? "h-8 px-2 py-1 text-xs" : "h-9 px-3 py-1.5 text-sm";

  return (
    <>
      <Button
        className={cn("inline-flex items-center gap-2", triggerSize, className)}
        onClick={() => {
          toast.info("El chat/formulario de contacto está en reconstrucción y temporalmente deshabilitado.");
        }}
      >
        <Mail className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
        <span>{buttonLabel}</span>
      </Button>
    </>
  );
}

