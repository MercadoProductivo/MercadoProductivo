"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LoginInput, loginSchema } from "@/schemas/auth";
import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelPasswordInput } from "@/components/ui/floating-label-password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { toSpanishErrorMessage } from "@/lib/i18n/errors";
import { LogIn } from "lucide-react";
import { logSecurityEventAction } from "@/app/actions/security";
import { SubmitButton } from "@/components/ui/submit-button";

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  function fieldAttrs<K extends keyof LoginInput>(name: K) {
    const state = form.getFieldState(name as any, form.formState);
    const invalid = Boolean(state.error);
    const value = form.getValues(name);
    const hasValue = typeof value === "string" ? value.trim().length > 0 : Boolean(value);
    const success = !invalid && (state.isDirty || state.isTouched || form.formState.isSubmitted) && hasValue;
    return {
      "aria-invalid": invalid || undefined,
      "data-success": success || undefined,
    } as any;
  }

  async function onSubmit(values: LoginInput) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        // Log failed login attempt via Server Action (Non-blocking)
        try {
          await logSecurityEventAction({
            type: 'LOGIN_FAILED',
            user_email: values.email,
            metadata: { error_message: error.message },
            severity: 'MEDIUM'
          });
        } catch (logError) {
          console.error("Failed to log login failure:", logError);
        }
        throw error;
      }

      // Log successful login via Server Action (Non-blocking)
      try {
        await logSecurityEventAction({
          type: 'LOGIN_SUCCESS',
          user_email: values.email,
          severity: 'LOW'
        });
      } catch (logError) {
        console.error("Failed to log login success:", logError);
      }

      toast.success("¡Bienvenido! 👋");
      router.replace("/dashboard");
    } catch (e: any) {
      toast.error(toSpanishErrorMessage(e, "Error al iniciar sesión"));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-4">
        <div className="space-y-1">
          <FloatingLabelInput
            id="email"
            type="email"
            autoComplete="email"
            label="Correo electrónico"
            {...form.register("email")}
            {...fieldAttrs("email")}
          />
          <p className={`min-h-[20px] text-xs ${form.formState.errors.email ? "text-red-500 font-medium" : "opacity-0"}`} aria-live="polite">
            {form.formState.errors.email?.message || " "}
          </p>
        </div>

        <div className="space-y-1">
          <FloatingLabelPasswordInput
            id="password"
            label="Contraseña"
            autoComplete="current-password"
            {...form.register("password")}
            {...fieldAttrs("password")}
          />
          <p className={`min-h-[20px] text-xs ${form.formState.errors.password ? "text-red-500 font-medium" : "opacity-0"}`} aria-live="polite">
            {form.formState.errors.password?.message || " "}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="remember"
          checked={form.watch("remember")}
          onCheckedChange={(c) =>
            form.setValue("remember", c === true, {
              shouldValidate: false,
              shouldDirty: true,
              shouldTouch: true,
            })
          }
        />
        <Label htmlFor="remember" className="text-sm text-muted-foreground">Recordarme</Label>
      </div>

      <SubmitButton isLoading={loading} text="Iniciar sesión" loadingText="Ingresando...">
        <LogIn size={16} className="mr-2" /> Iniciar sesión
      </SubmitButton>
    </form>
  );
}
