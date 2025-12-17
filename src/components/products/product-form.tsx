"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ClipboardEvent, FormEvent, DragEvent } from "react";
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
import { UploadCloud, X } from "lucide-react";
import { useGeoRef } from "@/hooks/use-geo-ref";
import { usePlanLimits } from "@/hooks/use-plan-limits";
import { useProductImages } from "@/hooks/use-product-images";
import { SubmitButton } from "@/components/ui/submit-button";

// Aceptar string o number y normalizar valores numéricos con coma/punto
const numberFromInput = z.union([z.string(), z.number()]).transform((val) => {
  const str = typeof val === "number" ? String(val) : val;
  const normalized = str.toString().replace(/[^0-9.,-]/g, "").replace(",", ".");
  return Number(normalized);
});

const productSchema = z.object({
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
  price: numberFromInput.refine((v) => !Number.isNaN(v) && v > 0, { message: "Ingresa un precio válido" }),
  quantity_value: numberFromInput.refine((v) => !Number.isNaN(v) && v > 0, { message: "Ingresa una cantidad válida" }),
  quantity_unit: z.enum(["unidad", "kg", "tn"], { required_error: "Selecciona unidad" }),
  province: z.string().min(1, "Selecciona una provincia"),
  city: z.string().min(1, "Selecciona una localidad"),
});

export type ProductFormValues = z.input<typeof productSchema>;

type ProductFormProps = {
  missingLabels?: string[];
};

export default function ProductForm({ missingLabels = [] }: ProductFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [profileOk, setProfileOk] = useState<boolean>(missingLabels.length === 0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    mode: "onBlur",
    defaultValues: {
      title: "",
      description: "",
      category: "",
      price: "",
      quantity_value: "",
      quantity_unit: undefined as any,
      province: "",
      city: "",
    },
  });

  // Hooks encapsulados
  const { maxFiles, maxProducts, limitReached } = usePlanLimits();
  const {
    cities,
    loadingCities,
    provinces: AR_PROVINCES
  } = useGeoRef(form.watch("province"));

  const {
    files,
    isDragging,
    isFull,
    MAX_SIZE_MB,
    appendFiles,
    removeFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    uploadImages
  } = useProductImages({ maxFiles });

  // Efecto: verificar perfil completo
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

  // Efecto: resetear ciudad si cambia provincia
  const selectedProvince = form.watch("province");
  useEffect(() => {
    if (selectedProvince) {
      form.setValue("city", "", { shouldValidate: true });
    }
  }, [selectedProvince, form]);


  // Cargar categorías
  useEffect(() => {
    (async () => {
      setLoadingCategories(true);
      try {
        const { data: catData, error: catError } = await supabase.from("categories").select("*");
        if (!catError && Array.isArray(catData)) {
          const list = Array.from(
            new Set(
              (catData as any[])
                .map((r) => (r?.name ?? r?.title ?? r?.label ?? r?.slug ?? "").toString().replace(/[-_]/g, " ").trim())
                .filter(Boolean)
            )
          ).sort((a, b) => a.localeCompare(b));
          setCategories(list);
          return;
        }
        const { data, error } = await supabase
          .from("products")
          .select("category")
          .not("category", "is", null);
        if (error) throw error;
        const list = Array.from(
          new Set(
            (data || [])
              .map((r: any) => (r?.category ?? "").toString().trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b));
        setCategories(list);
      } catch {
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, [supabase]);

  function showError(name: keyof ProductFormValues) {
    const state = form.getFieldState(name, form.formState);
    return !!(state.error && (state.isTouched || form.formState.isSubmitted));
  }

  function fieldErrorClass(name: keyof ProductFormValues) {
    return showError(name) ? "border-red-500 focus-visible:ring-red-500" : undefined;
  }

  // Handlers input
  const handleDescriptionKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key && e.key.length === 1 && /[0-9]/.test(e.key)) e.preventDefault();
  };
  const handleDescriptionBeforeInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const data = (e as any)?.nativeEvent?.data as string | null;
    if (data && /[0-9]/.test(data)) e.preventDefault();
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
      requestAnimationFrame(() => { try { el.selectionStart = el.selectionEnd = start + sanitized.length; } catch { } });
    }
  };

  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key && e.key.length === 1 && /[0-9]/.test(e.key)) e.preventDefault();
  };
  const handleTitleBeforeInput = (e: FormEvent<HTMLInputElement>) => {
    const data = (e as any)?.nativeEvent?.data as string | null;
    if (data && /[0-9]/.test(data)) e.preventDefault();
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
      requestAnimationFrame(() => { try { el.selectionStart = el.selectionEnd = start + sanitized.length; } catch { } });
    }
  };

  const handlePriceKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const ctrlOrCmd = e.ctrlKey || e.metaKey;
    if (["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", ",", "."].includes(e.key) || (ctrlOrCmd && ["a", "c", "v", "x"].includes(e.key.toLowerCase()))) return;
    if (!/^[0-9]$/.test(e.key)) { e.preventDefault(); return; }
    if ((e.target as HTMLInputElement).value.length >= 10) e.preventDefault();
  };

  const handleQuantityKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const ctrlOrCmd = e.ctrlKey || e.metaKey;
    if (["Backspace", "Delete", "Tab", "Escape", "Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", ",", "."].includes(e.key) || (ctrlOrCmd && ["a", "c", "v", "x"].includes(e.key.toLowerCase()))) return;
    if (!/^[0-9]$/.test(e.key)) { e.preventDefault(); return; }
    if ((e.target as HTMLInputElement).value.length >= 10) e.preventDefault();
  };

  async function onSubmit(raw: ProductFormValues) {
    if (!profileOk) {
      toast.error("Completa tu perfil antes de publicar productos");
      return;
    }
    if (limitReached) {
      toast.error(`Alcanzaste el máximo de ${maxProducts ?? 0} productos para tu plan.`);
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");

      const values = productSchema.parse(raw);

      // Verificación final de límite
      const { count: countNow } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('published', true);
      if (typeof maxProducts === 'number' && (countNow ?? 0) >= maxProducts) {
        throw new Error(`Límite alcanzado: tu plan permite hasta ${maxProducts} productos.`);
      }

      const payload = {
        user_id: user.id,
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category,
        price: values.price,
        quantity_value: values.quantity_value,
        quantity_unit: values.quantity_unit,
        location: `${values.city}, ${values.province} `,
        published: true,
        created_at: new Date().toISOString(),
      };

      const { data: createdProduct, error: insertError } = await supabase
        .from("products")
        .insert(payload)
        .select("id")
        .single();
      if (insertError) throw insertError;

      const imageUrls = await uploadImages(user.id);

      if (createdProduct?.id && imageUrls.length) {
        const rows = imageUrls.map((url) => ({ product_id: createdProduct.id, url }));
        const { error: piError } = await supabase.from("product_images").insert(rows);
        if (piError) {
          console.error(piError);
          toast.error("Error al registrar algunas imágenes. Edita el producto para reintentar.");
        }
      }

      toast.success("Producto creado");
      router.replace("/dashboard/products");
      router.refresh();
    } catch (e: any) {
      console.error(e);
      toast.error(`Error: ${e?.message || "No se pudo crear el producto"} `);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
      {!profileOk && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 sm:text-sm">
          Para publicar productos, primero completa tu perfil (incluye tu CP).
        </div>
      )}
      {limitReached && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 sm:text-sm">
          Alcanzaste el máximo de {maxProducts ?? 0} productos. <a href="/planes" className="ml-2 underline hover:text-orange-800">Ver planes</a>
        </div>
      )}

      {/* Titulo */}
      <div className="space-y-2">
        <Label className={showError("title") ? "text-red-500" : undefined}>Título <span className="text-red-500">*</span></Label>
        <Input
          id="title" maxLength={20} inputMode="text"
          {...form.register("title")}
          onKeyDown={handleTitleKeyDown} onBeforeInput={handleTitleBeforeInput} onPaste={handleTitlePaste}
          disabled={saving} className={fieldErrorClass("title")}
        />
        <div className="text-xs text-muted-foreground">{(form.watch("title")?.length ?? 0)} / 20</div>
        {showError("title") && <p role="alert" className="text-xs text-red-500">{form.getFieldState("title", form.formState).error?.message}</p>}
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label className={showError("description") ? "text-red-500" : undefined}>Descripción <span className="text-red-500">*</span></Label>
        <div className="rounded border border-amber-300 bg-amber-50 p-2 text-[12px] text-amber-900">
          Seguridad: no incluyas datos personales. No se permiten números.
        </div>
        <Textarea
          id="description" rows={5} maxLength={250} inputMode="text"
          {...form.register("description")}
          onKeyDown={handleDescriptionKeyDown} onBeforeInput={handleDescriptionBeforeInput} onPaste={handleDescriptionPaste}
          disabled={saving} className={fieldErrorClass("description")}
        />
        <div className="text-[11px] text-muted-foreground">{(form.watch("description")?.length ?? 0)} / 250</div>
        {showError("description") && <p role="alert" className="text-xs text-red-500">{form.getFieldState("description", form.formState).error?.message}</p>}
      </div>

      {/* Grid: Cat, Precio, Cantidad */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-1">
          <Label>Categoría <span className="text-red-500">*</span></Label>
          <Select
            value={form.watch("category") || ""}
            onValueChange={(v) => form.setValue("category", v, { shouldValidate: true, shouldDirty: true })}
            disabled={saving || loadingCategories}
          >
            <SelectTrigger className={fieldErrorClass("category")}>
              <SelectValue placeholder={loadingCategories ? "..." : "Selecciona"} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {showError("category") && <p role="alert" className="text-xs text-red-500">{form.getFieldState("category", form.formState).error?.message}</p>}
        </div>

        <div className="space-y-2 sm:col-span-1">
          <Label>Precio (ARS) <span className="text-red-500">*</span></Label>
          <Input
            inputMode="decimal" placeholder="0,00" maxLength={10}
            {...form.register("price")} onKeyDown={handlePriceKeyDown} disabled={saving} className={fieldErrorClass("price")}
          />
          {showError("price") && <p role="alert" className="text-xs text-red-500">{form.getFieldState("price", form.formState).error?.message}</p>}
        </div>

        <div className="space-y-2 sm:col-span-1">
          <Label>Cantidad <span className="text-red-500">*</span></Label>
          <div className="flex gap-2">
            <Input
              inputMode="decimal" placeholder="0" maxLength={10}
              {...form.register("quantity_value")} onKeyDown={handleQuantityKeyDown} disabled={saving} className={fieldErrorClass("quantity_value")}
            />
            <Select onValueChange={(v) => form.setValue("quantity_unit", v as any)} disabled={saving}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Unidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unidad">Unidades</SelectItem>
                <SelectItem value="kg">Kg</SelectItem>
                <SelectItem value="tn">Tn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid: Geo */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Provincia <span className="text-red-500">*</span></Label>
          <Select
            value={form.watch("province") || ""}
            onValueChange={(v) => form.setValue("province", v, { shouldValidate: true, shouldDirty: true })}
            disabled={saving}
          >
            <SelectTrigger className={fieldErrorClass("province")}>
              <SelectValue placeholder="Seleccione provincia" />
            </SelectTrigger>
            <SelectContent>
              {AR_PROVINCES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {showError("province") && <p role="alert" className="text-xs text-red-500">{form.getFieldState("province", form.formState).error?.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Localidad <span className="text-red-500">*</span></Label>
          <Select
            value={form.watch("city") || ""}
            onValueChange={(v) => form.setValue("city", v, { shouldValidate: true, shouldDirty: true })}
            disabled={saving || !form.watch("province") || loadingCities}
          >
            <SelectTrigger className={fieldErrorClass("city")}>
              <SelectValue placeholder={loadingCities ? "Cargando..." : "Selecciona localidad"} />
            </SelectTrigger>
            <SelectContent>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {showError("city") && <p role="alert" className="text-xs text-red-500">{form.getFieldState("city", form.formState).error?.message}</p>}
        </div>
      </div>

      {/* Imágenes */}
      <div className="space-y-2">
        <Label>Imágenes ({files.length} / {maxFiles})</Label>
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
          <p className="text-center text-muted-foreground">Arrastra y suelta imágenes aquí</p>
          <Button type="button" variant="outline" disabled={saving || isFull} className="bg-white text-[#f06d04] border border-[#f06d04]">
            Seleccionar
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
          <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP. Máx {MAX_SIZE_MB}MB</p>
        </div>

        {files.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {files.map((file, i) => (
              <div key={i} className="relative group aspect-square rounded overflow-hidden border">
                <img src={URL.createObjectURL(file)} alt="preview" className="object-cover w-full h-full" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  className="absolute top-1 right-1 bg-white/80 hover:bg-red-500 hover:text-white text-gray-700 rounded-full p-1 shadow-sm transition-colors"
                  title="Eliminar imagen"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" disabled={saving} onClick={() => router.back()}>
          Cancelar
        </Button>
        <SubmitButton isLoading={saving} loadingText="Guardando..." className="bg-orange-500 text-white hover:bg-orange-600 focus-visible:ring-orange-600" data-testid="product-form-submit">
          Publicar
        </SubmitButton>
      </div>
    </form>
  );
}
