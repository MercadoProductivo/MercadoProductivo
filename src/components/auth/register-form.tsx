"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { RegisterInput, registerSchema } from "@/schemas/auth";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ShoppingCart, Store, UserPlus } from "lucide-react";
import { toSpanishErrorMessage } from "@/lib/i18n/errors";

type RegisterFormValues = Omit<RegisterInput, "acceptTerms"> & { acceptTerms: boolean };

export default function RegisterForm() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      userType: "buyer",
      acceptTerms: false,
    },
  });

  const userType = form.watch("userType");

  // Helpers de estado visual por campo
  function fieldAttrs<K extends keyof RegisterFormValues>(name: K) {
    const state = form.getFieldState(name as any, form.formState);
    const invalid = Boolean(state.error);
    const value = form.getValues(name);
    const hasValue = typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
    const success = !invalid && (state.isDirty || state.isTouched || form.formState.isSubmitted) && hasValue;
    return {
      "aria-invalid": invalid || undefined,
      "data-success": success || undefined,
    } as any;
  }

  async function onSubmit(values: RegisterFormValues) {
    setLoading(true);
    try {
      // Normalizar email
      const emailNormalized = (values.email || '').trim().toLowerCase();

      // Validar email vía endpoint (server-side, sin caché)
      let exists = false;
      try {
        const res = await fetch('/api/auth/check-email', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store',
          },
          body: JSON.stringify({ email: emailNormalized }),
        });
        if (!res.ok) {
          console.error('[register] check-email failed', res.status);
          toast.error('No se pudo validar el correo. Intenta nuevamente.');
          return;
        }
        const json = (await res.json()) as { exists?: boolean };
        exists = Boolean(json?.exists);
      } catch (err) {
        console.error('[register] check-email network/error', err);
        toast.error('No se pudo validar el correo. Revisa tu conexión e intenta de nuevo.');
        return;
      }
      if (exists) {
        form.setError('email', {
          type: 'manual',
          message: 'Este correo ya está registrado. ¿Olvidaste tu contraseña?',
        });
        toast.error('Este correo electrónico ya está registrado');
        return;
      }

      // Si el correo no existe, proceder con el registro
      const { error: signUpError } = await supabase.auth.signUp({
        email: emailNormalized,
        password: values.password,
        options: {
          data: {
            role: values.userType,
            full_name: `${values.firstName} ${values.lastName}`.trim(),
            user_type: values.userType,
            first_name: values.firstName,
            last_name: values.lastName,
            ...(values.userType === "seller"
              ? { plan_code: "gratis", plan: "Plan Básico" }
              : {}),
          },
          emailRedirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}/auth/login?verified=1`
              : undefined,
        },
      });

      if (signUpError) throw signUpError;

      // Asegurar que no quede sesión activa automáticamente tras el registro
      try { await supabase.auth.signOut(); } catch {}

      toast.success("Te enviamos un correo para verificar tu cuenta");
      router.replace(`/auth/login?check_email=1&email=${encodeURIComponent(emailNormalized)}`);
    } catch (e: any) {
      const rawMsg = typeof e?.message === 'string' ? e.message : '';
      if (/user already registered/i.test(rawMsg) || /email already in use/i.test(rawMsg)) {
        form.setError('email', {
          type: 'manual',
          message: 'Este correo ya está registrado. ¿Olvidaste tu contraseña?',
        });
        toast.error('Este correo electrónico ya está registrado');
      } else {
        console.error('Error en el registro:', e);
        toast.error(toSpanishErrorMessage(e, "Error al crear la cuenta"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
      {/* Nombre y Apellido */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" autoComplete="given-name" placeholder="Tu nombre" {...form.register("firstName")} {...fieldAttrs("firstName")} />
          <p className={`min-h-[16px] text-sm ${form.formState.errors.firstName ? "text-red-500" : "opacity-0"}`}>
            {form.formState.errors.firstName?.message || "\u00A0"}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" autoComplete="family-name" placeholder="Tu apellido" {...form.register("lastName")} {...fieldAttrs("lastName")} />
          <p className={`min-h-[16px] text-sm ${form.formState.errors.lastName ? "text-red-500" : "opacity-0"}`}>
            {form.formState.errors.lastName?.message || "\u00A0"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input 
          id="email" 
          type="email" 
          autoComplete="email" 
          placeholder="nombre@ejemplo.com" 
          {...form.register("email")} 
          {...fieldAttrs("email")}
        />
        <p className={`min-h-[16px] text-sm ${form.formState.errors.email ? "text-red-400" : "opacity-0"}`}>
          {form.formState.errors.email?.message || "\u00A0"}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <PasswordInput id="password" autoComplete="new-password" {...form.register("password")} {...fieldAttrs("password")} />
        <p className="text-xs text-[var(--text-secondary)]">Debe contener mayúscula, minúscula y número</p>
        <p className={`min-h-[16px] text-sm ${form.formState.errors.password ? "text-red-400" : "opacity-0"}`}>
          {form.formState.errors.password?.message || "\u00A0"}
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <PasswordInput 
          id="confirmPassword" 
          autoComplete="new-password" 
          {...form.register("confirmPassword")} 
          {...fieldAttrs("confirmPassword")} 
        />
        <p className={`min-h-[16px] text-sm ${form.formState.errors.confirmPassword ? "text-red-400" : "opacity-0"}`}>
          {form.formState.errors.confirmPassword?.message || "\u00A0"}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Tipo de cuenta</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => form.setValue("userType", "buyer")}
            className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm transition ${
              userType === "buyer"
                ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                : "border-[var(--border-light)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            }`}
          >
            <ShoppingCart size={16}/> Comprador
          </button>
          <button
            type="button"
            onClick={() => form.setValue("userType", "seller")}
            className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-sm transition ${
              userType === "seller"
                ? "border-orange-500 bg-orange-500 text-white shadow-sm"
                : "border-[var(--border-light)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
            }`}
          >
            <Store size={16}/> Vendedor
          </button>
        </div>
        {form.formState.errors.userType && (
          <p className="text-sm text-red-400">{form.formState.errors.userType.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Checkbox
            id="terms"
            checked={form.watch("acceptTerms")}
            onCheckedChange={(c) =>
              form.setValue("acceptTerms", c === true, {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            {...fieldAttrs("acceptTerms")}
          />
          <Label htmlFor="terms" className="text-sm font-normal">
            Acepto los{' '}
            <a href="/terminos" target="_blank" className="text-orange-500 hover:underline">
              Términos y Condiciones
            </a>{' '}
            y la{' '}
            <a href="/privacidad" target="_blank" className="text-orange-500 hover:underline">
              Política de Privacidad
            </a>
          </Label>
        </div>
        {form.formState.errors.acceptTerms && (
          <p className="text-sm text-red-400">
            {form.formState.errors.acceptTerms.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading || !form.formState.isValid}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            Creando cuenta...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <UserPlus size={16} />
            Crear cuenta
          </span>
        )}
      </Button>
    </form>
  );
}
