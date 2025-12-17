"use client";

import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
};

function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
  onConfirm,
  onCancel,
  onAfterClose,
}: ConfirmOptions & {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onAfterClose: () => void;
}) {
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleOpenChange = (value: boolean) => {
    setIsOpen(value);
    if (!value) {
      // Si se cierra por interacción externa (ESC), tratamos como cancel
      // Damos un pequeño delay para permitir la animación de salida
      setTimeout(() => {
        onCancel();
        onAfterClose();
      }, 300);
    }
  };

  const handleConfirm = (e: React.MouseEvent) => {
    e.preventDefault(); // Evitar cierre automático inmediato de Radix para controlar fn
    setIsOpen(false);
    setTimeout(() => {
      onConfirm();
      onAfterClose();
    }, 300);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(false);
    setTimeout(() => {
      onCancel();
      onAfterClose();
    }, 300);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function confirmModal({
  title = "¿Estás seguro?",
  description = "Esta acción no se puede deshacer.",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "default",
}: ConfirmOptions = {}): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      try {
        root.unmount();
      } catch { }
      container.remove();
    };

    const handleConfirm = () => {
      if (!resolved) {
        resolved = true;
        resolve(true);
      }
    };

    const handleCancel = () => {
      if (!resolved) {
        resolved = true;
        resolve(false);
      }
    };

    root.render(
      <ConfirmDialog
        open={true}
        title={title}
        description={description}
        confirmText={confirmText}
        cancelText={cancelText}
        variant={variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onAfterClose={cleanup}
      />
    );
  });
}
