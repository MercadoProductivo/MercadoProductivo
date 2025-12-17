"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent, type ClipboardEvent, type KeyboardEvent, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UploadCloud, ChevronLeft, ChevronRight } from "lucide-react";
import { buildSafeStoragePath } from "@/lib/images";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubmitButton } from "@/components/ui/submit-button";

// Provincias (reutilizamos de productos)
const AR_PROVINCES = [
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
  "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
  "Tucumán",
];

// Categorías de Servicios (según requerimiento)
const SERVICE_CATEGORIES: string[] = [
  "Producción Primaria",
  "Procesamiento y Transformación de Alimentos",
  "Almacenamiento y Acopio",
  "Transporte y Logística",
  "Comercialización y Exportación",
  "Suministro de Insumos",
  "Tecnología Agrícola (AgriTech) y Software de Gestión",
  "Servicios de Asesoramiento Técnico y Consultoría",
  "Control de Calidad y Certificaciones",
  "Servicios Financieros y Seguros Agropecuarios",
];
const TRANSPORT_CATEGORY = "Transporte y Logística" as const;

const numberFromInput = z.union([z.string(), z.number()]).transform((val) => {
  const str = typeof val === "number" ? String(val) : (val || "");
  const normalized = str.toString().replace(/[^0-9.,-]/g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
});

const serviceSchema = z.object({
  title: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(20, "Máximo 20 caracteres")
    .refine((v) => !/[0-9]/.test(v), { message: "El título no puede contener números" }),
  description: z
    .string()
    .min(10, "Mínimo 10 caracteres")
    .max(250, "Máximo 250 caracteres")
    .refine((v) => !/[0-9]/.test(v), { message: "La descripción no puede contener números" }),
  category: z.string().min(1, "Selecciona una categoría"),
  price: z
    .union([numberFromInput, z.literal("")])
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), { message: "Precio inválido" })
    .nullable(),
  province: z.string().optional(),
  city: z.string().optional(),
  // Campos especiales para Transporte y Logística
  origin_province: z.string().optional(),
  origin_city: z.string().optional(),
  dest_province: z.string().optional(),
  dest_city: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.category === TRANSPORT_CATEGORY) {
    if (!val.origin_province) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provincia de salida requerida", path: ["origin_province"] });
    }
    if (!val.origin_city) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Localidad de salida requerida", path: ["origin_city"] });
    }
    if (!val.dest_province) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provincia de llegada requerida", path: ["dest_province"] });
    }
    if (!val.dest_city) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Localidad de llegada requerida", path: ["dest_city"] });
    }
  } else {
    if (!val.province) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecciona una provincia", path: ["province"] });
    }
    if (!val.city) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecciona una localidad", path: ["city"] });
    }
  }
});

export type ServiceFormValues = z.input<typeof serviceSchema>;

export default function ServiceForm({ missingLabels = [] as string[] }: { missingLabels?: string[] }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [profileOk, setProfileOk] = useState<boolean>(missingLabels.length === 0);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [maxServices, setMaxServices] = useState<number | null>(null);
  const [servicesCount, setServicesCount] = useState<number>(0);
  const limitReached = useMemo(() => typeof maxServices === 'number' && servicesCount >= maxServices, [maxServices, servicesCount]);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [maxFiles, setMaxFiles] = useState<number>(5);
  const MAX_SIZE_MB = 5;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const isFull = files.length >= maxFiles;
  // Ciudades para Transporte y Logística
  const [originCities, setOriginCities] = useState<string[]>([]);
  const [destCities, setDestCities] = useState<string[]>([]);
  const [loadingOriginCities, setLoadingOriginCities] = useState(false);
  const [loadingDestCities, setLoadingDestCities] = useState(false);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      category: "",
      price: "" as any,
      province: "",
      city: "",
      origin_province: "",
      origin_city: "",
      dest_province: "",
      dest_city: "",
    },
  });

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("first_name,last_name,dni_cuit,address,city,province,postal_code")
          .eq("id", user.id)
          .single();
        const requiredMap: Record<string, string> = {
          first_name: "Nombre",
          last_name: "Apellido",
          dni_cuit: "DNI/CUIT",
          address: "Dirección",
          city: "Localidad",
          province: "Provincia",
          postal_code: "CP",
        };
        const missing: string[] = [];
        if (data) {
          Object.entries(requiredMap).forEach(([key, label]) => {
            // @ts-ignore
            if (!data[key] || String(data[key]).trim().length === 0) missing.push(label);
          });
        }
        setProfileOk(missing.length === 0);
      } catch {
        setProfileOk(missingLabels.length === 0);
      }
    })();
  }, [supabase, missingLabels]);

  // Cargar localidades al cambiar la provincia
  const selectedProvince = form.watch("province");
  const selectedCategory = form.watch("category");
  const selectedOriginProvince = form.watch("origin_province");
  const selectedDestProvince = form.watch("dest_province");
  useEffect(() => {
    async function loadCities(prov: string) {
      setLoadingCities(true);
      try {
        const url = `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(prov)}&campos=nombre&orden=nombre&max=5000`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("No se pudieron cargar localidades");
        const json = await res.json();
        const rawList: string[] = Array.isArray(json?.localidades)
          ? json.localidades.map((l: any) => String(l.nombre))
          : [];
        const list = Array.from(new Set(rawList as string[]));
        setCities(list);
      } catch {
        setCities([]);
      } finally {
        setLoadingCities(false);
      }
    }
    if (selectedProvince && selectedProvince.length > 0) {
      setCities([]);
      form.setValue("city", "", { shouldValidate: true });
      loadCities(selectedProvince);
    } else {
      setCities([]);
      form.setValue("city", "", { shouldValidate: true });
    }
  }, [selectedProvince, form]);

  // Cargar localidades para Origen (solo si categoría es Transporte y Logística)
  useEffect(() => {
    if (selectedCategory !== TRANSPORT_CATEGORY) return;
    async function loadCities(prov: string, setter: (v: string[]) => void, setLoading: (v: boolean) => void) {
      setLoading(true);
      try {
        const url = `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(prov)}&campos=nombre&orden=nombre&max=5000`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("No se pudieron cargar localidades");
        const json = await res.json();
        const rawList = Array.isArray(json?.localidades)
          ? json.localidades.map((l: any) => String(l.nombre))
          : [];
        setter(Array.from(new Set(rawList as string[])));
      } catch {
        setter([]);
      } finally {
        setLoading(false);
      }
    }
    if (selectedOriginProvince) {
      setOriginCities([]);
      form.setValue("origin_city", "", { shouldValidate: true });
      loadCities(selectedOriginProvince, setOriginCities, setLoadingOriginCities);
    } else {
      setOriginCities([]);
      form.setValue("origin_city", "", { shouldValidate: true });
    }
  }, [selectedCategory, selectedOriginProvince, form]);

  // Cargar localidades para Destino
  useEffect(() => {
    if (selectedCategory !== TRANSPORT_CATEGORY) return;
    async function loadCities(prov: string, setter: (v: string[]) => void, setLoading: (v: boolean) => void) {
      setLoading(true);
      try {
        const url = `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(prov)}&campos=nombre&orden=nombre&max=5000`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("No se pudieron cargar localidades");
        const json = await res.json();
        const rawList = Array.isArray(json?.localidades)
          ? json.localidades.map((l: any) => String(l.nombre))
          : [];
        setter(Array.from(new Set(rawList as string[])));
      } catch {
        setter([]);
      } finally {
        setLoading(false);
      }
    }
    if (selectedDestProvince) {
      setDestCities([]);
      form.setValue("dest_city", "", { shouldValidate: true });
      loadCities(selectedDestProvince, setDestCities, setLoadingDestCities);
    } else {
      setDestCities([]);
      form.setValue("dest_city", "", { shouldValidate: true });
    }
  }, [selectedCategory, selectedDestProvince, form]);

  // Resolver límite de servicios por plan y conteo actual (publicados)
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Conteo actual de servicios publicados
        const { count } = await supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('published', true);
        setServicesCount(count ?? 0);

        // Plan y máximo de servicios
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_code')
          .eq('id', user.id)
          .single();
        const planCode = (profile?.plan_code || '').toString();
        if (!planCode) {
          setMaxServices(null);
          return;
        }
        const { data: plan } = await supabase
          .from('plans')
          .select('max_services')
          .eq('code', planCode)
          .maybeSingle();
        const ms = (plan as any)?.max_services;
        setMaxServices(typeof ms === 'number' ? ms : (ms != null ? Number(ms) : null));
      } catch {
        setMaxServices(null);
      }
    })();
  }, [supabase]);

  // Límite de imágenes por servicio según plan (fallback 5)
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan_code')
          .eq('id', user.id)
          .single();
        const planCode = (profile?.plan_code || '').toString();
        if (!planCode) {
          setMaxFiles(5);
          return;
        }
        const { data: plan } = await supabase
          .from('plans')
          .select('max_images_per_service')
          .eq('code', planCode)
          .maybeSingle();
        const maxImages = Number((plan as any)?.max_images_per_service) || 5;
        setMaxFiles(maxImages);
      } catch {
        setMaxFiles(5);
      }
    })();
  }, [supabase]);

  // Handlers para bloquear números en la descripción
  const handleDescriptionKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key && e.key.length === 1 && /[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleDescriptionBeforeInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const data = (e as any)?.nativeEvent?.data as string | null;
    if (data && /[0-9]/.test(data)) {
      e.preventDefault();
    }
  };

  const handleDescriptionPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData?.getData("text") ?? "";
    if (/[0-9]/.test(text)) {
      e.preventDefault();
      const sanitized = text.replace(/[0-9]/g, "");
      const el = e.target as HTMLTextAreaElement;
      const prev = el.value || "";
      const start = el.selectionStart ?? prev.length;
      const end = el.selectionEnd ?? prev.length;
      const next = prev.slice(0, start) + sanitized + prev.slice(end);
      form.setValue("description", next, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      requestAnimationFrame(() => {
        try {
          el.selectionStart = el.selectionEnd = start + sanitized.length;
        } catch { }
      });
    }
  };

  // Handlers para bloquear números en el título
  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key && e.key.length === 1 && /[0-9]/.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleTitleBeforeInput = (e: FormEvent<HTMLInputElement>) => {
    const data = (e as any)?.nativeEvent?.data as string | null;
    if (data && /[0-9]/.test(data)) {
      e.preventDefault();
    }
  };

  const handleTitlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData?.getData("text") ?? "";
    if (/[0-9]/.test(text)) {
      e.preventDefault();
      const sanitized = text.replace(/[0-9]/g, "");
      const el = e.target as HTMLInputElement;
      const prev = el.value || "";
      const start = el.selectionStart ?? prev.length;
      const end = el.selectionEnd ?? prev.length;
      const next = prev.slice(0, start) + sanitized + prev.slice(end);
      form.setValue("title", next, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      requestAnimationFrame(() => {
        try {
          el.selectionStart = el.selectionEnd = start + sanitized.length;
        } catch { }
      });
    }
  };

  // Bloquear caracteres no numéricos en el campo de precio y limitar a 10 caracteres
  const handlePriceKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const ctrlOrCmd = e.ctrlKey || e.metaKey;
    const allowed = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      ",",
      ".",
    ];

    // Permitir teclas de control
    if (allowed.includes(e.key) || (ctrlOrCmd && ["a", "c", "v", "x"].includes(e.key.toLowerCase()))) {
      return;
    }

    // Bloquear caracteres no numéricos
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    // Limitar a 10 caracteres
    const currentValue = (e.target as HTMLInputElement).value;
    if (currentValue.length >= 10) {
      e.preventDefault();
    }
  };


  function appendFiles(newFiles: FileList | File[]) {
    if (saving || isFull) return;
    const all = Array.from(newFiles);
    const images = all.filter((f) => f.type.startsWith("image/"));
    if (!images.length) return;
    const tooBig = images.filter((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (tooBig.length) {
      toast.error(`Algunas imágenes superan ${MAX_SIZE_MB}MB y fueron omitidas`);
    }
    const accepted = images.filter((f) => f.size <= MAX_SIZE_MB * 1024 * 1024);
    setFiles((prev) => {
      const remainingSlots = Math.max(0, maxFiles - prev.length);
      const next = [...prev, ...accepted.slice(0, remainingSlots)];
      if (accepted.length > remainingSlots) {
        toast.error(`Máximo ${maxFiles} imágenes por servicio`);
      }
      return next;
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (saving || isFull) return;
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (saving || isFull) return;
    if (e.dataTransfer?.files?.length) {
      appendFiles(e.dataTransfer.files);
    }
  }

  async function uploadImages(userId: string): Promise<string[]> {
    if (!files.length) return [];
    const bucket = "service-images";
    const urls: string[] = [];
    for (const f of files) {
      const { path } = buildSafeStoragePath({ userId, file: f });
      const { error } = await supabase.storage.from(bucket).upload(path, f, {
        cacheControl: "3600",
        upsert: false,
        contentType: f.type || undefined,
      });
      if (error) throw new Error(`Error subiendo imagen: ${error.message}`);
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (data?.publicUrl) urls.push(data.publicUrl);
    }
    return urls;
  }

  const showError = (name: keyof ServiceFormValues) => {
    const state = form.getFieldState(name, form.formState);
    return !!(state.error && (state.isTouched || form.formState.isSubmitted));
  };

  const fieldErrorClass = (name: keyof ServiceFormValues) => (showError(name) ? "border-red-500 focus-visible:ring-red-500" : undefined);

  async function onSubmit(raw: ServiceFormValues) {
    if (!profileOk) {
      toast.error("Completa tu perfil antes de publicar servicios");
      return;
    }
    if (limitReached) {
      toast.error(`Alcanzaste el máximo de ${maxServices ?? 0} servicios para tu plan. Actualiza tu plan para publicar más.`);
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const values = serviceSchema.parse(raw);

      // Re-chequeo de límite por si cambió en otra pestaña
      try {
        const { count: countNow } = await supabase
          .from('services')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('published', true);
        if (typeof maxServices === 'number' && (countNow ?? 0) >= maxServices) {
          throw new Error(`Límite alcanzado: tu plan permite hasta ${maxServices} servicios.`);
        }
      } catch (err: any) {
        toast.error(err?.message || 'No puedes publicar más servicios con tu plan actual.');
        return;
      }
      // Construir location
      const isTransport = values.category === TRANSPORT_CATEGORY;
      const locationStr = isTransport
        ? `${values.origin_city}, ${values.origin_province} → ${values.dest_city}, ${values.dest_province}`
        : `${values.city}, ${values.province}`;

      const payload = {
        user_id: user.id,
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category.trim(),
        price: values.price === null ? null : values.price,
        location: locationStr,
        // Guardamos también los campos atómicos de ubicación
        province: isTransport ? null : (values.province || null),
        city: isTransport ? null : (values.city || null),
        origin_province: isTransport ? (values.origin_province || null) : null,
        origin_city: isTransport ? (values.origin_city || null) : null,
        dest_province: isTransport ? (values.dest_province || null) : null,
        dest_city: isTransport ? (values.dest_city || null) : null,
        published: true,
        created_at: new Date().toISOString(),
      } as const;

      // Crear servicio y recuperar su id
      const { data: createdService, error: insertError } = await supabase
        .from("services")
        .insert(payload as any)
        .select("id")
        .single();
      if (insertError) throw insertError;

      // Subir imágenes después de crear el servicio para evitar huérfanas
      const imageUrls = await uploadImages(user.id);
      if (createdService?.id && imageUrls.length) {
        const rows = imageUrls.map((url) => ({ service_id: createdService.id, url }));
        const { error: siError } = await supabase.from("service_images").insert(rows as any);
        if (siError) {
          console.error(siError);
          toast.error("Algunas imágenes no pudieron registrarse (límite o error). Puedes editar el servicio luego.");
        }
      }

      toast.success("Servicio publicado");
      // Redirigir a listado (si no existe, fallback al dashboard)
      try {
        router.replace("/dashboard/services");
      } catch {
        router.replace("/dashboard");
      }
      router.refresh();
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (/relation\s+\"?services\"?\s+does not exist/i.test(msg)) {
        toast.error("Backend aún no disponible (tabla services). El formulario ya está listo.");
      } else if (/relation\s+\"?service_images\"?\s+does not exist/i.test(msg)) {
        toast.error("Falta la tabla 'service_images' en BD. Ejecuta la migración propuesta.");
      } else if (/bucket.*not.*found/i.test(msg)) {
        toast.error("Falta el bucket 'service-images' en Supabase Storage. Crea el bucket o ajusta la config.");
      } else if (/row-level security|RLS|permission denied|not authorized/i.test(msg)) {
        toast.error("Permisos insuficientes para crear servicio (RLS). Revisa políticas en Supabase.");
      } else {
        toast.error(`No se pudo crear el servicio: ${msg}`);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
      {!profileOk && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 sm:text-sm">
          Para publicar servicios, primero completa tu perfil (incluye tu CP). Ve al Dashboard y completa los datos requeridos.
        </div>
      )}
      {limitReached && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 sm:text-sm">
          Alcanzaste el máximo de {maxServices ?? 0} servicios para tu plan. Para publicar más, actualiza tu plan.
          <a href="/planes" className="ml-2 underline text-orange-700 hover:text-orange-800">Ver planes</a>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="title" className={showError("title") ? "text-red-500" : undefined}>
          Título <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          maxLength={20}
          inputMode="text"
          {...form.register("title")}
          onKeyDown={handleTitleKeyDown}
          onBeforeInput={handleTitleBeforeInput}
          onPaste={handleTitlePaste}
          disabled={saving}
          className={fieldErrorClass("title")}
        />
        <div className="text-xs text-muted-foreground">{(form.watch("title")?.length ?? 0)} / 20 caracteres</div>
        {showError("title") && (
          <p role="alert" className="text-xs text-red-500">{form.getFieldState("title", form.formState).error?.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className={showError("description") ? "text-red-500" : undefined}>
          Descripción <span className="text-red-500">*</span>
        </Label>
        <div className="rounded border border-amber-300 bg-amber-50 p-2 text-[12px] text-amber-900">
          Seguridad: no incluyas datos personales o sensibles (teléfono, dirección, email, DNI, CBU, etc.).
          Evita compartir información de contacto. No se permiten números en la descripción.
        </div>
        <Textarea
          id="description"
          rows={5}
          maxLength={250}
          inputMode="text"
          {...form.register("description")}
          onKeyDown={handleDescriptionKeyDown}
          onBeforeInput={handleDescriptionBeforeInput}
          onPaste={handleDescriptionPaste}
          disabled={saving}
          className={fieldErrorClass("description")}
        />
        <div className="text-[11px] text-muted-foreground">{(form.watch("description")?.length ?? 0)} / 250 caracteres</div>
        {showError("description") && (
          <p role="alert" className="text-xs text-red-500">{form.getFieldState("description", form.formState).error?.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-1">
          <Label className={showError("category") ? "text-red-500" : undefined}>Categoría <span className="text-red-500">*</span></Label>
          <Select
            value={form.watch("category") || ""}
            onValueChange={(v) => form.setValue("category", v, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
            disabled={saving}
          >
            <SelectTrigger className={fieldErrorClass("category")}>
              <SelectValue placeholder="Selecciona" />
            </SelectTrigger>
            <SelectContent position="popper" className="z-50">
              {SERVICE_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showError("category") && (
            <p role="alert" className="text-xs text-red-500">{form.getFieldState("category", form.formState).error?.message}</p>
          )}
        </div>
        <div className="space-y-2 sm:col-span-1">
          <Label className={showError("price") ? "text-red-500" : undefined}>Precio (ARS) <span className="text-muted-foreground">(opcional)</span></Label>
          <Input
            inputMode="decimal"
            placeholder="0,00"
            maxLength={10}
            {...form.register("price")}
            onKeyDown={handlePriceKeyDown}
            disabled={saving}
            className={fieldErrorClass("price")}
          />
          {showError("price") && (
            <p role="alert" className="text-xs text-red-500">{form.getFieldState("price", form.formState).error?.message}</p>
          )}
        </div>
      </div>

      {/* Ubicación: estándar u Origen/Destino para Transporte y Logística */}
      {selectedCategory !== TRANSPORT_CATEGORY ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className={showError("province") ? "text-red-500" : undefined}>Provincia <span className="text-red-500">*</span></Label>
            <Select value={form.watch("province") || ""} onValueChange={(v) => form.setValue("province", v, { shouldValidate: true, shouldDirty: true, shouldTouch: true })} disabled={saving}>
              <SelectTrigger className={fieldErrorClass("province")}>
                <SelectValue placeholder="Selecciona provincia" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50">
                {AR_PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showError("province") && (
              <p role="alert" className="text-xs text-red-500">{form.getFieldState("province", form.formState).error?.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className={showError("city") ? "text-red-500" : undefined}>Localidad <span className="text-red-500">*</span></Label>
            <Select value={form.watch("city") || ""} onValueChange={(v) => form.setValue("city", v, { shouldValidate: true, shouldDirty: true, shouldTouch: true })} disabled={saving || !form.watch("province") || loadingCities}>
              <SelectTrigger className={fieldErrorClass("city")}>
                <SelectValue placeholder={loadingCities ? "Cargando..." : (!form.watch("province") ? "Selecciona provincia primero" : "Selecciona localidad")} />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50">
                {loadingCities && <SelectItem value="__loading" disabled>Cargando...</SelectItem>}
                {!loadingCities && (!cities.length ? (
                  <SelectItem value="__empty" disabled>Sin localidades</SelectItem>
                ) : (
                  cities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))
                ))}
              </SelectContent>
            </Select>
            {showError("city") && (
              <p role="alert" className="text-xs text-red-500">{form.getFieldState("city", form.formState).error?.message}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Origen */}
          <div className="space-y-2">
            <Label className={showError("origin_province") ? "text-red-500" : undefined}>Provincia de salida <span className="text-red-500">*</span></Label>
            <Select value={form.watch("origin_province") || ""} onValueChange={(v) => form.setValue("origin_province", v, { shouldValidate: true, shouldDirty: true, shouldTouch: true })} disabled={saving}>
              <SelectTrigger className={fieldErrorClass("origin_province")}>
                <SelectValue placeholder="Selecciona provincia" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50">
                {AR_PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showError("origin_province") && (
              <p role="alert" className="text-xs text-red-500">{form.getFieldState("origin_province", form.formState).error?.message}</p>
            )}
            <Label className={showError("origin_city") ? "text-red-500" : undefined}>Localidad de salida <span className="text-red-500">*</span></Label>
            <Select value={form.watch("origin_city") || ""} onValueChange={(v) => form.setValue("origin_city", v, { shouldValidate: true, shouldDirty: true, shouldTouch: true })} disabled={saving || !form.watch("origin_province") || loadingOriginCities}>
              <SelectTrigger className={fieldErrorClass("origin_city")}>
                <SelectValue placeholder={loadingOriginCities ? "Cargando..." : (!form.watch("origin_province") ? "Selecciona provincia primero" : "Selecciona localidad")} />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50">
                {loadingOriginCities && <SelectItem value="__loading" disabled>Cargando...</SelectItem>}
                {!loadingOriginCities && (!originCities.length ? (
                  <SelectItem value="__empty" disabled>Sin localidades</SelectItem>
                ) : (
                  originCities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))
                ))}
              </SelectContent>
            </Select>
            {showError("origin_city") && (
              <p role="alert" className="text-xs text-red-500">{form.getFieldState("origin_city", form.formState).error?.message}</p>
            )}
          </div>
          {/* Destino */}
          <div className="space-y-2">
            <Label className={showError("dest_province") ? "text-red-500" : undefined}>Provincia de llegada <span className="text-red-500">*</span></Label>
            <Select value={form.watch("dest_province") || ""} onValueChange={(v) => form.setValue("dest_province", v, { shouldValidate: true, shouldDirty: true, shouldTouch: true })} disabled={saving}>
              <SelectTrigger className={fieldErrorClass("dest_province")}>
                <SelectValue placeholder="Selecciona provincia" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50">
                {AR_PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showError("dest_province") && (
              <p role="alert" className="text-xs text-red-500">{form.getFieldState("dest_province", form.formState).error?.message}</p>
            )}
            <Label className={showError("dest_city") ? "text-red-500" : undefined}>Localidad de llegada <span className="text-red-500">*</span></Label>
            <Select value={form.watch("dest_city") || ""} onValueChange={(v) => form.setValue("dest_city", v, { shouldValidate: true, shouldDirty: true, shouldTouch: true })} disabled={saving || !form.watch("dest_province") || loadingDestCities}>
              <SelectTrigger className={fieldErrorClass("dest_city")}>
                <SelectValue placeholder={loadingDestCities ? "Cargando..." : (!form.watch("dest_province") ? "Selecciona provincia primero" : "Selecciona localidad")} />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50">
                {loadingDestCities && <SelectItem value="__loading" disabled>Cargando...</SelectItem>}
                {!loadingDestCities && (!destCities.length ? (
                  <SelectItem value="__empty" disabled>Sin localidades</SelectItem>
                ) : (
                  destCities.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))
                ))}
              </SelectContent>
            </Select>
            {showError("dest_city") && (
              <p role="alert" className="text-xs text-red-500">{form.getFieldState("dest_city", form.formState).error?.message}</p>
            )}
          </div>
        </div>
      )}

      {/* Imágenes del servicio (replica de productos) */}
      <div className="space-y-2">
        <Label>Imágenes</Label>
        <div
          className={`flex flex-col items-center justify-center gap-3 rounded border-2 border-dashed p-8 text-sm ${(!isFull && !saving && isDragging) ? "border-orange-500 bg-orange-50" : "border-muted"} ${(saving || isFull) ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !(saving || isFull) && fileInputRef.current?.click()}
          role="button"
          aria-disabled={saving || isFull}
          tabIndex={(saving || isFull) ? -1 : 0}
          onKeyDown={(e) => {
            if (saving || isFull) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <UploadCloud className="h-8 w-8 text-[#f06d04]" />
          <p className="text-center text-muted-foreground">Arrastra y suelta imágenes aquí o</p>
          <Button type="button" variant="outline" disabled={saving || isFull} className="bg-white text-[#f06d04] border border-[#f06d04] hover:bg-[#f06d04]/10">
            Seleccionar imágenes
          </Button>
          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept="image/*"
            multiple
            disabled={saving || isFull}
            onChange={(e) => appendFiles(e.target.files || [])}
          />
          <p className="text-[11px] text-muted-foreground">Formatos soportados: JPG, PNG, WEBP. Máx {maxFiles} imágenes, {MAX_SIZE_MB}MB c/u.</p>
        </div>

        {isFull && (
          <div className="mt-1 text-[11px] text-amber-700">
            Límite de imágenes alcanzado para tu plan ({maxFiles}). Elimina alguna imagen o mejora tu plan.
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {files.map((f, i) => (
              <div
                key={i}
                className="group relative h-24 w-full cursor-zoom-in overflow-hidden rounded border"
                onClick={() => setPreviewIndex(i)}
              >
                <Image src={URL.createObjectURL(f)} alt={f.name} fill className="object-cover" />
                <button
                  type="button"
                  aria-label="Eliminar imagen"
                  className="absolute right-1 top-1 hidden rounded px-2 py-0.5 text-[11px] bg-red-600/10 text-red-800 hover:bg-red-600 hover:text-white group-hover:block transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="text-[11px] text-muted-foreground">{files.length} / {maxFiles} imágenes seleccionadas</div>

        {previewIndex !== null && files[previewIndex] && (
          <Dialog open={previewIndex !== null} onOpenChange={(open) => !open && setPreviewIndex(null)}>
            <DialogContent className="sm:max-w-3xl">
              <DialogHeader>
                <DialogTitle>Vista previa</DialogTitle>
              </DialogHeader>
              <div className="relative w-full" style={{ minHeight: "50vh" }}>
                <Image
                  src={URL.createObjectURL(files[previewIndex])}
                  alt={files[previewIndex].name}
                  fill
                  className="rounded bg-black object-contain"
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setPreviewIndex((idx) => (idx === null ? idx : (idx - 1 + files.length) % files.length))
                  }
                  disabled={files.length <= 1}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                </Button>
                <div className="text-xs text-muted-foreground">{(previewIndex ?? 0) + 1} / {files.length}</div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewIndex((idx) => (idx === null ? idx : (idx + 1) % files.length))}
                  disabled={files.length <= 1}
                >
                  Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="pt-2">
        <SubmitButton isLoading={saving} loadingText="Publicando..." className="bg-orange-500 hover:bg-orange-600">
          Publicar servicio
        </SubmitButton>
      </div>
    </form>
  );
}
