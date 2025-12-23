"use client";
import { startTransition, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import ProfileForm from "@/components/profile/profile-form";
import { useRouter } from "next/navigation";
import { Edit2, Save, X } from "lucide-react";

export default function ProfileFormCard() {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const submitRef = useRef<(() => void) | null>(null);
  const resetRef = useRef<(() => void) | null>(null);

  const handleClick = () => {
    if (!editing) {
      setEditing(true);
      return;
    }
    // Guardar
    submitRef.current?.();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2 pb-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Mi Perfil</h2>
          <p className="text-sm text-muted-foreground">Gestiona tu identidad, información de contacto y preferencias de cuenta.</p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-center">
          {editing && (
            <Button
              size="sm"
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:text-slate-900"
              onClick={() => {
                resetRef.current?.();
                setEditing(false);
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleClick}
            variant={editing ? "default" : "outline"}
            className={`min-w-[140px] shadow-sm transition-all ${!editing
                ? "bg-white text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300 hover:shadow-md"
                : "bg-orange-600 hover:bg-orange-700 text-white hover:shadow-md"
              }`}
          >
            {editing ? (
              <>
                <Save className="mr-2 h-4 w-4" /> Guardar
              </>
            ) : (
              <>
                <Edit2 className="mr-2 h-4 w-4" /> Editar perfil
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <ProfileForm
          disabled={!editing}
          hideInternalSubmit
          registerSubmit={(fn) => {
            submitRef.current = fn;
          }}
          registerReset={(fn) => {
            resetRef.current = fn;
          }}
          onSaved={() => {
            setEditing(false);
            // Forzar que el server component del dashboard recalcule los campos requeridos
            startTransition(() => router.refresh());
          }}
        />
      </div>
    </div>
  );
}
