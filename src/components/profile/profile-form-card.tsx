"use client";

import { startTransition, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ProfileForm from "@/components/profile/profile-form";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useNavigationGuard } from "@/hooks/use-navigation-guard";
import { useRouter } from "next/navigation";
import { Save, RotateCcw } from "lucide-react";

/**
 * Contenedor del formulario de perfil.
 * - Siempre en modo edición (sin botón "Editar").
 * - Bloquea TODA la navegación cuando hay cambios sin guardar:
 *     · Cierre de pestaña / refresh → dialog nativo del browser
 *     · Clicks en links del menú   → dialog estilizado
 *     · Botón Atrás del browser    → dialog estilizado
 */
export default function ProfileFormCard() {
  const router = useRouter();

  // Refs para controlar submit/reset del formulario hijo
  const submitRef = useRef<(() => void) | null>(null);
  const resetRef  = useRef<(() => void) | null>(null);

  // Estado del formulario
  const [isDirty, setIsDirty] = useState(false);
  const [saving,  setSaving]  = useState(false);

  // Modal de confirmación
  const [dialogOpen, setDialogOpen] = useState(false);
  // Callback a resumir después de que el usuario decida
  const pendingProceedRef = useRef<(() => void) | null>(null);

  // ── Guard de navegación ──────────────────────────────────────────────────
  useNavigationGuard({
    enabled: isDirty,
    onAttempt: useCallback((proceed: () => void) => {
      pendingProceedRef.current = proceed;
      setDialogOpen(true);
    }, []),
  });

  // ── Acciones del modal ───────────────────────────────────────────────────

  /** Cancelar: cerrar el modal y quedarse en la página */
  const handleModalCancel = useCallback(() => {
    pendingProceedRef.current = null;
    setDialogOpen(false);
  }, []);

  /** Guardar y luego navegar */
  const handleModalSave = useCallback(() => {
    setSaving(true);
    submitRef.current?.();
    // onSaved() se encargará de cerrar el dialog y ejecutar la navegación pendiente
  }, []);

  /** Salir sin guardar */
  const handleModalDiscard = useCallback(() => {
    resetRef.current?.();
    setIsDirty(false);
    setDialogOpen(false);
    const proceed = pendingProceedRef.current;
    pendingProceedRef.current = null;
    proceed?.();
  }, []);

  // ── Callback cuando el formulario guarda exitosamente ────────────────────
  const handleSaved = useCallback(() => {
    setSaving(false);
    setIsDirty(false);
    setDialogOpen(false);
    const proceed = pendingProceedRef.current;
    pendingProceedRef.current = null;
    if (proceed) {
      proceed();
    } else {
      startTransition(() => router.refresh());
    }
  }, [router]);

  // ── Acciones manuales desde los botones del header ────────────────────────
  const handleSaveClick = useCallback(() => {
    setSaving(true);
    submitRef.current?.();
  }, []);

  const handleResetClick = useCallback(() => {
    resetRef.current?.();
    setIsDirty(false);
  }, []);

  return (
    <>
      {/* Modal de cambios sin guardar */}
      <UnsavedChangesDialog
        open={dialogOpen}
        saving={saving}
        onCancel={handleModalCancel}
        onSave={handleModalSave}
        onDiscard={handleModalDiscard}
      />

      <div className="space-y-6">
        {/* Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2 pb-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Mi Perfil</h2>
            <p className="text-sm text-muted-foreground">
              Gestiona tu identidad, información de contacto y preferencias de cuenta.
            </p>
          </div>

          {/* Botones de acción: aparecen solo cuando hay cambios */}
          <div
            className={`flex items-center gap-3 self-start sm:self-center transition-all duration-300 ${
              isDirty
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 pointer-events-none translate-y-1"
            }`}
            aria-hidden={!isDirty}
          >
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={handleResetClick}
              disabled={saving}
              className="text-muted-foreground hover:text-slate-900 gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Descartar
            </Button>

            <Button
              size="sm"
              type="button"
              onClick={handleSaveClick}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 min-w-[130px] shadow-sm"
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
          </div>
        </div>

        {/* Indicador de cambios pendientes */}
        {isDirty && (
          <div
            className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 animate-in fade-in slide-in-from-top-1 duration-200"
            role="status"
            aria-live="polite"
          >
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Tenés cambios sin guardar — recordá guardar antes de salir.
          </div>
        )}

        {/* Formulario — siempre habilitado ────────────────────────────── */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ProfileForm
            disabled={false}
            hideInternalSubmit={true}
            onDirtyChange={setIsDirty}
            onSavingChange={setSaving}
            registerSubmit={(fn) => { submitRef.current = fn; }}
            registerReset={(fn)  => { resetRef.current  = fn; }}
            onSaved={handleSaved}
          />
        </div>
      </div>
    </>
  );
}
