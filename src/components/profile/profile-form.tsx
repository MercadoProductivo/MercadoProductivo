"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { toSpanishErrorMessage } from "@/lib/i18n/errors";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { buildSafeStoragePath } from "@/lib/images";
import { Switch } from "@/components/ui/switch";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Camera, MapPin, User, Building, Phone, Mail, FileText, Globe } from "lucide-react";

function isValidDniCuit(raw: string): boolean {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length >= 7 && digits.length <= 8) {
    // DNI 7 u 8 dígitos
    return /^\d{7,8}$/.test(digits);
  }

  if (digits.length === 11) {
    // CUIT 11 dígitos con dígito verificador
    if (!/^\d{11}$/.test(digits)) return false;
    const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const nums = digits.split("").map((n) => parseInt(n, 10));
    const sum = weights.reduce((acc, w, i) => acc + w * nums[i], 0);
    const mod = sum % 11;
    let check = 11 - mod;
    if (check === 11) check = 0;
    if (check === 10) check = 9;
    return check === nums[10];
  }
  return false;
}

function sanitizePhone(raw?: string) {
  return String(raw || "").replace(/\D/g, "");
}

const profileSchema = z.object({
  first_name: z.string().min(1, "Requerido"),
  last_name: z.string().min(1, "Requerido"),
  email: z.string().email("Email inválido"),
  dni_cuit: z
    .string()
    .min(1, "Requerido")
    .refine((v) => isValidDniCuit(v), {
      message: "Ingrese DNI (7-8 dígitos) o CUIT válido (11 dígitos).",
    }),
  company: z.string().optional().or(z.literal("")),
  address: z.string().min(1, "Requerido"),
  city: z.string().min(1, "Requerido"),
  province: z.string().min(1, "Requerido"),
  cp: z.string().min(1, "Requerido"),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => {
      const d = String(v || "").replace(/\D/g, "");
      return d.length === 0 || (d.length >= 10 && d.length <= 15);
    }, { message: "Ingrese código de área y número (mínimo 10 dígitos)." }),
  // Campo Deluxe
  exportador: z.boolean().optional().default(false),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

type ProfileFormProps = {
  disabled?: boolean;
  hideInternalSubmit?: boolean;
  registerSubmit?: (submit: () => void) => void;
  registerReset?: (reset: () => void) => void;
  onSaved?: () => void;
};

export default function ProfileForm({ disabled = false, hideInternalSubmit = false, registerSubmit, registerReset, onSaved }: ProfileFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [saving, setSaving] = useState(false);
  const [savingExportador, setSavingExportador] = useState(false);
  const [loading, setLoading] = useState(true);
  const existingPlanCodeRef = useRef<string | null>(null);
  const exportadorColumnExistsRef = useRef<boolean>(true);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      dni_cuit: "",
      company: "",
      address: "",
      city: "",
      province: "",
      cp: "",
      phone: "",
      exportador: false,
    },
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const AVATAR_BUCKET = "avatars";
  const AVATAR_MAX_MB = 5;

  function fieldAttrs<K extends keyof ProfileFormValues>(name: K) {
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

  // Provincias de Argentina
  const provinces = useMemo(
    () => [
      "Buenos Aires",
      "Ciudad Autónoma de Buenos Aires",
      "Catamarca",
      "Chaco",
      "Chubut",
      "Córdoba",
      "Corrientes",
      "Entre Ríos",
      "Formosa",
      "Jujuy",
      "La Pampa",
      "La Rioja",
      "Mendoza",
      "Misiones",
      "Neuquén",
      "Río Negro",
      "Salta",
      "San Juan",
      "San Luis",
      "Santa Cruz",
      "Santa Fe",
      "Santiago del Estero",
      "Tierra del Fuego",
      "Tucumán",
    ],
    []
  );

  // Utilidades: normalizar nombres para igualar contra opciones (quita acentos y pasa a minúsculas)
  const normalize = (s: string) =>
    (s || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const provinceCanonical = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of provinces) {
      map.set(normalize(p), p);
    }
    return (raw: string) => map.get(normalize(raw)) || raw;
  }, [provinces]);

  const [localities, setLocalities] = useState<string[]>([]);
  const [loadingLocalities, setLoadingLocalities] = useState(false);
  const isInitializing = useRef(true);
  const initialValuesRef = useRef<ProfileFormValues | null>(null);

  // Helper para cargar localidades de una provincia (memoizado)
  const loadLocalities = useCallback(async (prov: string, preserveCity: boolean) => {
    if (!prov) {
      setLocalities([]);
      return;
    }
    try {
      setLoadingLocalities(true);
      const url = `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(prov)}&max=500`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Error al cargar localidades");
      const data = await res.json();
      const rawItems = (data?.localidades || []).map((l: any) => String(l?.nombre)).filter(Boolean);
      const items: string[] = Array.from(new Set(rawItems as string[])).sort();
      const currentCity = form.getValues("city");
      if (preserveCity && currentCity && !items.includes(currentCity)) {
        setLocalities([currentCity, ...items]);
      } else {
        setLocalities(items);
      }
    } catch (e) {
      console.warn("Fallo carga de localidades (helper)", e);
      setLocalities([]);
    } finally {
      setLoadingLocalities(false);
    }
  }, [form]);

  // Cargar localidades cuando cambia provincia
  useEffect(() => {
    const subscription = form.watch(async (value, { name }) => {
      if (name === "province") {
        // Evitar borrar 'city' cuando el cambio de provincia proviene de form.reset inicial
        if (isInitializing.current) return;
        const prov = value.province as string;
        // Reiniciar ciudad
        form.setValue("city", "");
        setLocalities([]);
        await loadLocalities(prov, false);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, loadLocalities]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      let data: any = null;
      let error: any = null;
      {
        const res = await supabase
          .from("profiles")
          .select("first_name, last_name, dni_cuit, company, address, city, province, postal_code, plan_code, avatar_url, exportador, phone")
          .eq("id", user.id)
          .single();
        data = res.data; error = res.error;
      }
      // Si falla por columna inexistente, reintentar sin 'exportador'
      if (error && /exportador|column|does not exist/i.test(error?.message || "")) {
        exportadorColumnExistsRef.current = false;
        const res2 = await supabase
          .from("profiles")
          .select("first_name, last_name, dni_cuit, company, address, city, province, postal_code, plan_code, avatar_url, phone")
          .eq("id", user.id)
          .single();
        data = res2.data; error = res2.error;
      }
      if (!mounted) return;
      if (error && error.code !== "PGRST116") {
        console.error(error);
        toast.error("No se pudo cargar el perfil");
      }
      const initial: ProfileFormValues = {
        first_name: data?.first_name ?? (user.user_metadata?.first_name ?? ""),
        last_name: data?.last_name ?? (user.user_metadata?.last_name ?? ""),
        email: user.email ?? "",
        dni_cuit: data?.dni_cuit ?? "",
        company: data?.company ?? "",
        address: data?.address ?? "",
        city: (data?.city ?? ""),
        province: provinceCanonical(data?.province ?? ""),
        cp: data?.postal_code ?? "",
        phone: data?.phone ?? "",
        exportador: exportadorColumnExistsRef.current ? Boolean((data as any)?.exportador) || false : false,
      };
      form.reset(initial);
      initialValuesRef.current = initial;
      existingPlanCodeRef.current = (data?.plan_code ?? null) as any;
      setAvatarUrl(data?.avatar_url ?? null);
      // Cargar localidades para la provincia reseteada y preservar la ciudad existente
      const provToLoad = provinceCanonical(data?.province ?? "");
      if (provToLoad) {
        await loadLocalities(provToLoad, true);
      } else {
        setLocalities([]);
      }
      setLoading(false);
      // A partir de aquí, los cambios de provincia ya son del usuario
      isInitializing.current = false;
    })();
    return () => { mounted = false; };
  }, [form, supabase, loadLocalities, provinceCanonical]);

  async function handleAvatarSelected(file: File) {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen");
      return;
    }
    if (file.size > AVATAR_MAX_MB * 1024 * 1024) {
      toast.error(`La imagen supera ${AVATAR_MAX_MB}MB`);
      return;
    }
    setAvatarUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { path } = buildSafeStoragePath({ userId: user.id, file });
      const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || undefined,
      });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const publicUrl = data?.publicUrl as string | undefined;
      if (!publicUrl) throw new Error("No se pudo obtener URL pública del avatar");
      const { error: dbErr } = await supabase
        .from("profiles")
        .upsert({ id: (await supabase.auth.getUser()).data.user!.id, avatar_url: publicUrl, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (dbErr) throw dbErr;
      try {
        await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      } catch { }
      setAvatarUrl(publicUrl);
      toast.success("Avatar actualizado");
      try {
        window.dispatchEvent(new CustomEvent("profile:updated", { detail: { avatar_url: publicUrl } }));
      } catch { }
    } catch (e: any) {
      console.error(e);
      const msg = e?.message ?? String(e);
      if (/bucket.*not.*found/i.test(msg)) {
        toast.error("Falta el bucket 'avatars' en Supabase Storage. Crea el bucket o ajusta la configuración.");
      } else if (/row-level security|RLS|permission denied|not authorized/i.test(msg)) {
        toast.error("Permisos insuficientes para subir avatar (RLS). Revisa políticas en Supabase.");
      } else {
        toast.error(toSpanishErrorMessage(e, "No se pudo actualizar el avatar"));
      }
    } finally {
      setAvatarUploading(false);
    }
  }

  function onAvatarInputChange(e: any) {
    const f = e?.target?.files?.[0];
    if (f) handleAvatarSelected(f);
    if (e?.target) e.target.value = "";
  }

  // Guardado inmediato del switch de Exportador (independiente del resto del formulario)
  async function saveExportadorImmediate(nextValue: boolean, prevValue?: boolean) {
    if (!exportadorColumnExistsRef.current) return;
    setSavingExportador(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const planLower = (existingPlanCodeRef.current || "").toLowerCase();
      const isDeluxe = (planLower.includes("deluxe") || planLower.includes("diamond") || planLower === "premium" || planLower === "pro");
      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      // Solo persistimos exportador si el plan lo permite, caso contrario lo forzamos a false
      payload.exportador = isDeluxe ? Boolean(nextValue) : false;
      // Asegurar que el trigger tenga NEW.plan_code
      const roleRaw = (((user.user_metadata as any)?.role) || ((user.user_metadata as any)?.user_type) || "") as string;
      const roleNormalized = roleRaw === "anunciante" ? "seller" : roleRaw;
      if (existingPlanCodeRef.current) {
        payload.plan_code = existingPlanCodeRef.current;
      } else if (roleNormalized === "seller") {
        payload.plan_code = "free";
      }
      const { data: saved, error } = await supabase
        .from("profiles")
        .update({ exportador: payload.exportador, updated_at: payload.updated_at })
        .eq("id", user.id)
        .select("exportador, plan_code")
        .single();
      if (error) throw error;
      if (typeof saved?.exportador === "boolean") {
        // Sincronizar por si el trigger lo ajustó
        form.setValue("exportador", saved.exportador, { shouldDirty: false, shouldTouch: false });
        // Mantener snapshot inicial actualizado para que Cancelar no revierta cambios ya persistidos
        if (initialValuesRef.current) {
          initialValuesRef.current.exportador = saved.exportador;
        }
      }
    } catch (e: any) {
      console.error("Perfil: error al guardar toggle exportador", e);
      const hint = e?.hint || e?.details || (e?.error_description ?? e?.message);
      const msg = toSpanishErrorMessage(e, hint || "No se pudo actualizar la preferencia de exportador");
      toast.error(msg);
      // Revertir UI (volvemos al valor actual en formulario)
      const fallback = typeof prevValue === "boolean" ? prevValue : !nextValue;
      form.setValue("exportador", Boolean(fallback), { shouldDirty: false, shouldTouch: false });
    } finally {
      setSavingExportador(false);
    }
  }

  const onSubmit = useCallback(async (values: ProfileFormValues) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const full_name = `${values.first_name} ${values.last_name}`.trim();
      const dniCuitSanitized = (values.dni_cuit || "").replace(/\D/g, "");
      const payload: any = {
        first_name: values.first_name,
        last_name: values.last_name,
        full_name,
        dni_cuit: dniCuitSanitized,
        company: values.company ?? "",
        address: values.address,
        city: values.city,
        province: values.province,
        postal_code: values.cp,
        phone: sanitizePhone(values.phone || ""),
        updated_at: new Date().toISOString(),
      };
      // Persistir exportador sólo si el plan es Deluxe (o sinónimos/variantes)
      const planLower = (existingPlanCodeRef.current || "").toLowerCase();
      const isDeluxe = (planLower.includes("deluxe") || planLower.includes("diamond") || planLower === "premium" || planLower === "pro");
      if (exportadorColumnExistsRef.current) {
        payload.exportador = isDeluxe ? Boolean(values.exportador) : false;
      }
      //
      // Incluir siempre plan_code en el payload para que el trigger tenga el valor en NEW.plan_code
      const roleRaw = (((user.user_metadata as any)?.role) || ((user.user_metadata as any)?.user_type) || "") as string;
      const roleNormalized = roleRaw === "anunciante" ? "seller" : roleRaw;
      if (existingPlanCodeRef.current) {
        payload.plan_code = existingPlanCodeRef.current;
      } else if (roleNormalized === "seller") {
        // Si es vendedor y aún no tiene plan_code, asignar 'free' por defecto
        payload.plan_code = "free";
      }
      const { data: saved, error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...payload }, { onConflict: "id" })
        .select("exportador, plan_code")
        .single();
      if (error) throw error;
      // Sincronizar el valor por si el trigger lo ajustó
      if (exportadorColumnExistsRef.current && typeof saved?.exportador === "boolean") {
        form.setValue("exportador", saved.exportador, { shouldDirty: false, shouldTouch: false });
      }
      // Actualizar snapshot inicial con los valores guardados
      try {
        const currentEmail = form.getValues("email");
        const snapshot: ProfileFormValues = {
          first_name: values.first_name,
          last_name: values.last_name,
          email: currentEmail,
          dni_cuit: dniCuitSanitized,
          company: values.company ?? "",
          address: values.address,
          city: values.city,
          province: values.province,
          cp: values.cp,
          phone: sanitizePhone(values.phone || ""),
          exportador: exportadorColumnExistsRef.current
            ? (typeof saved?.exportador === "boolean" ? saved.exportador : Boolean(values.exportador))
            : false,
        };
        initialValuesRef.current = snapshot;
      } catch { }
      // Actualizar metadata de auth para reflejar el nombre en listeners de auth
      try {
        await supabase.auth.updateUser({
          data: {
            full_name,
            first_name: values.first_name,
            last_name: values.last_name,
          },
        });
      } catch { }
      toast.success("Perfil actualizado");
      try {
        // Notificar en tiempo real al header sin depender de Realtime
        window.dispatchEvent(
          new CustomEvent("profile:updated", { detail: payload as any })
        );
      } catch { }
      onSaved?.();
    } catch (e: any) {
      console.error("Perfil: error al guardar", e);
      const hint = e?.hint || e?.details || (e?.error_description ?? e?.message);
      const msg = toSpanishErrorMessage(e, hint || "No se pudo actualizar el perfil");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }, [form, supabase, onSaved]);

  // Exponer submit externo si se solicita
  useEffect(() => {
    if (!registerSubmit) return;
    const submit = () => form.handleSubmit(onSubmit as any)();
    registerSubmit(submit);
  }, [form, registerSubmit, onSubmit]);

  // Exponer reset externo (para botón Cancelar en el contenedor)
  useEffect(() => {
    if (!registerReset) return;
    const reset = () => {
      if (initialValuesRef.current) {
        const initial = initialValuesRef.current;
        form.reset(initial);
        // Recalcular localidades para la provincia restaurada y preservar la ciudad restaurada
        const prov = initial.province;
        if (prov) {
          void loadLocalities(prov, true);
        } else {
          setLocalities([]);
        }
      } else {
        // Fallback por seguridad
        form.reset(form.getValues());
      }
    };
    registerReset(reset);
  }, [form, registerReset, loadLocalities]);

  if (loading) {
    return (
      <div className="space-y-5" aria-busy>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="space-y-2 lg:col-span-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2 lg:col-span-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const allDisabled = disabled || saving;
  const planCodeLower = (existingPlanCodeRef.current || "").toLowerCase();
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filteredValue = e.target.value.replace(/[^+\d\s]/g, '');
    form.setValue("phone", filteredValue);
  };
  function hasExportadorCapability(code: string) {
    const c = (code || "").toLowerCase();
    // Soporta variantes como 'deluxe_monthly'/'deluxe_yearly' y sinónimos como 'diamond'.
    if (!c) return false;
    if (c.includes("deluxe") || c.includes("diamond")) return true;
    // Compatibilidad histórica: permitir premium/pro si así se configuró el backend
    return c === "premium" || c === "pro";
  }
  const canToggleExportador = exportadorColumnExistsRef.current && hasExportadorCapability(planCodeLower);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

      {/* SECCIÓN 1: Identidad (Avatar + Nombre) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <User className="h-5 w-5 text-orange-500" />
            Información Personal
          </CardTitle>
          <CardDescription>Tu identidad pública en la plataforma.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Avatar Row */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group shrink-0">
              <Avatar className="h-28 w-28 border-4 border-white shadow-lg cursor-pointer bg-slate-100">
                <AvatarImage src={avatarUrl || ""} className="object-cover" />
                <AvatarFallback className="bg-orange-100 text-orange-600 text-3xl font-bold">
                  {form.getValues("first_name")?.[0]?.toUpperCase()}{form.getValues("last_name")?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-[1px]"
                onClick={() => avatarInputRef.current?.click()}
              >
                <Camera className="h-8 w-8 text-white drop-shadow-md" />
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onAvatarInputChange}
                disabled={allDisabled || avatarUploading}
              />
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <h3 className="font-medium text-lg">Tu Foto de Perfil</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Sube una foto clara y profesional. Esta imagen será visible para los compradores y en tus publicaciones.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarUploading}
                >
                  <Camera className="h-3.5 w-3.5" />
                  {avatarUploading ? "Subiendo..." : "Cambiar imagen"}
                </Button>
                <span className="text-xs text-muted-foreground">Máx {AVATAR_MAX_MB}MB. JPG, PNG.</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Names Input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="first_name" className={form.getFieldState("first_name", form.formState).error ? "text-red-600" : ""}>
                Nombre <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="first_name"
                  {...form.register("first_name")}
                  className={form.getFieldState("first_name", form.formState).error ? "border-red-500 focus-visible:ring-red-500" : ""}
                  disabled={allDisabled}
                  placeholder="Tu nombre"
                />
              </div>
              {form.getFieldState("first_name", form.formState).error && (
                <p role="alert" className="text-xs text-red-500 font-medium">{form.getFieldState("first_name", form.formState).error?.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name" className={form.getFieldState("last_name", form.formState).error ? "text-red-600" : ""}>
                Apellido <span className="text-red-500">*</span>
              </Label>
              <Input
                id="last_name"
                {...form.register("last_name")}
                className={form.getFieldState("last_name", form.formState).error ? "border-red-500 focus-visible:ring-red-500" : ""}
                disabled={allDisabled}
                placeholder="Tu apellido"
              />
              {form.getFieldState("last_name", form.formState).error && (
                <p role="alert" className="text-xs text-red-500 font-medium">{form.getFieldState("last_name", form.formState).error?.message}</p>
              )}
            </div>
          </div>

          {/* Fiscal Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="dni_cuit" className={form.getFieldState("dni_cuit", form.formState).error ? "text-red-600" : ""}>
                DNI o CUIT <span className="text-red-500">*</span>
              </Label>
              <Input
                id="dni_cuit"
                {...form.register("dni_cuit")}
                className={form.getFieldState("dni_cuit", form.formState).error ? "border-red-500 focus-visible:ring-red-500" : ""}
                disabled={allDisabled}
                placeholder="Sin puntos ni guiones"
              />
              {form.getFieldState("dni_cuit", form.formState).error && (
                <p role="alert" className="text-xs text-red-500 font-medium">{form.getFieldState("dni_cuit", form.formState).error?.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Empresa (Opcional)</Label>
              <div className="relative">
                <Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
                <Input
                  id="company"
                  {...form.register("company")}
                  className="pl-9"
                  placeholder="Nombre de tu negocio"
                  disabled={allDisabled}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN 2: Contacto */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Mail className="h-5 w-5 text-orange-500" />
            Información de Contacto
          </CardTitle>
          <CardDescription>Medios para contactarte y recibir notificaciones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
                <Input
                  id="email"
                  {...form.register("email")}
                  readOnly
                  disabled
                  className="bg-slate-50 pl-9 font-medium text-slate-600"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">Para cambiar tu email, contacta a soporte.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono / WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/50" />
                <Input
                  id="phone"
                  value={form.watch("phone") || ""}
                  onChange={handlePhoneChange}
                  placeholder="Ej: +54 9 11 1234 5678"
                  className={`pl-9 ${form.getFieldState("phone", form.formState).error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                  disabled={allDisabled}
                />
              </div>
              {form.getFieldState("phone", form.formState).error && (
                <p role="alert" className="text-xs text-red-500 font-medium">{form.getFieldState("phone", form.formState).error?.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECCIÓN 3: Ubicación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-5 w-5 text-orange-500" />
            Ubicación
          </CardTitle>
          <CardDescription>Dirección para gestión de envíos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Provincia y City Selects */}
            <div className="space-y-2">
              <Label className={form.getFieldState("province", form.formState).error ? "text-red-600" : ""}>Provincia <span className="text-red-500">*</span></Label>
              <Controller
                name="province"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => field.onChange(v)}>
                    <SelectTrigger className={form.getFieldState("province", form.formState).error ? "border-red-500" : ""} disabled={allDisabled}>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[200px]">
                      {provinces.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.getFieldState("province", form.formState).error && (
                <p role="alert" className="text-xs text-red-500 font-medium">{form.getFieldState("province", form.formState).error?.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className={form.getFieldState("city", form.formState).error ? "text-red-600" : ""}>Localidad <span className="text-red-500">*</span></Label>
              <Controller
                name="city"
                control={form.control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={allDisabled || !form.getValues("province") || loadingLocalities || localities.length === 0}
                  >
                    <SelectTrigger className={form.getFieldState("city", form.formState).error ? "border-red-500" : ""}>
                      <SelectValue placeholder={!form.getValues("province") ? "Elige provincia primero" : loadingLocalities ? "Cargando..." : "Seleccionar..."} />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[200px]">
                      {localities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.getFieldState("city", form.formState).error && (
                <p role="alert" className="text-xs text-red-500 font-medium">{form.getFieldState("city", form.formState).error?.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-9 space-y-2">
              <Label className={form.getFieldState("address", form.formState).error ? "text-red-600" : ""}>Dirección <span className="text-red-500">*</span></Label>
              <Input
                {...form.register("address")}
                placeholder="Calle, Número, Piso, Depto"
                disabled={allDisabled}
                className={form.getFieldState("address", form.formState).error ? "border-red-500" : ""}
              />
              {form.getFieldState("address", form.formState).error && (
                <p role="alert" className="text-xs text-red-500 font-medium">{form.getFieldState("address", form.formState).error?.message}</p>
              )}
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label className={form.getFieldState("cp", form.formState).error ? "text-red-600" : ""}>CP <span className="text-red-500">*</span></Label>
              <Input
                {...form.register("cp")}
                disabled={allDisabled}
                placeholder="1234"
                className={form.getFieldState("cp", form.formState).error ? "border-red-500" : ""}
              />
              {form.getFieldState("cp", form.formState).error && (
                <p role="alert" className="text-xs text-red-500 font-medium">{form.getFieldState("cp", form.formState).error?.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SWITCH EXPORTADOR - Enhanced */}
      {canToggleExportador && (
        <Card className="border-orange-200 bg-orange-50/40 overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-orange-600" />
                  <Label className="text-base font-semibold text-orange-900">Perfil Exportador</Label>
                  <span className="inline-flex items-center rounded-full border border-orange-200 bg-white px-2 py-0.5 text-[10px] font-bold text-orange-600 shadow-sm">
                    PREMIUM
                  </span>
                </div>
                <p className="text-sm text-muted-foreground w-full md:w-[90%] leading-relaxed">
                  Al activar esta opción, tu perfil aparecerá destacado en el <strong className="font-medium text-orange-800">catálogo internacional</strong> de exportadores.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium transition-colors ${form.watch("exportador") ? "text-orange-700" : "text-muted-foreground"}`}>
                  {form.watch("exportador") ? "Activado" : "Desactivado"}
                </span>
                <Controller
                  name="exportador"
                  control={form.control}
                  render={({ field }) => (
                    <Switch
                      checked={Boolean(field.value)}
                      onCheckedChange={(v) => { const prev = Boolean(field.value); field.onChange(v); void saveExportadorImmediate(v, prev); }}
                      disabled={saving || savingExportador}
                      className="data-[state=checked]:bg-orange-500"
                    />
                  )}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Actions */}
      {!hideInternalSubmit && (
        <div className="sticky bottom-4 z-10 mx-auto max-w-4xl rounded-xl border bg-white/80 p-4 shadow-lg backdrop-blur-sm dark:bg-slate-900/80 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none transition-all">
          <SubmitButton isLoading={saving} className="w-full sm:w-auto min-w-[200px] h-11 text-base shadow-md hover:shadow-lg transition-all" loadingText="Guardando cambios...">
            Guardar Cambios
          </SubmitButton>
        </div>
      )}
    </form>
  );
}
