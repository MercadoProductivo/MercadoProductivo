"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Save, LogOut, X } from "lucide-react";

interface UnsavedChangesDialogProps {
  open: boolean;
  onCancel: () => void;     // Quedarse en la página
  onSave: () => void;       // Guardar y luego navegar
  onDiscard: () => void;    // Salir sin guardar
  saving?: boolean;
}

export function UnsavedChangesDialog({
  open,
  onCancel,
  onSave,
  onDiscard,
  saving = false,
}: UnsavedChangesDialogProps) {
  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent
        className="sm:max-w-md gap-0 p-0 overflow-hidden border-0 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={onCancel}
      >
        {/* Franja superior de警告 */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-400" />

        <div className="p-6 pb-5">
          <DialogHeader className="gap-3">
            {/* Ícono */}
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 ring-8 ring-amber-50/50 mb-1">
              <AlertTriangle className="h-7 w-7 text-amber-500" strokeWidth={2.5} />
            </div>

            <DialogTitle className="text-center text-xl font-bold text-slate-900">
              Tenés cambios sin guardar
            </DialogTitle>

            <DialogDescription className="text-center text-slate-500 text-sm leading-relaxed">
              Si salís ahora, perderás todos los cambios que realizaste en tu perfil.
              <br />
              ¿Querés guardarlos antes de continuar?
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-2">
            {/* Salir sin guardar */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              disabled={saving}
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 gap-1.5 w-full sm:w-auto"
            >
              <LogOut className="h-3.5 w-3.5" />
              Salir sin guardar
            </Button>

            {/* Espacio */}
            <div className="flex-1 hidden sm:block" />

            {/* Cancelar */}
            <Button
              variant="outline"
              size="sm"
              onClick={onCancel}
              disabled={saving}
              className="gap-1.5 w-full sm:w-auto"
            >
              <X className="h-3.5 w-3.5" />
              Cancelar
            </Button>

            {/* Guardar */}
            <Button
              size="sm"
              onClick={onSave}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 w-full sm:w-auto min-w-[120px]"
            >
              {saving ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Guardar cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
