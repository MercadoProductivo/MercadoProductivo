"use client";

import { useEffect, useMemo, useRef, useState, useCallback, type DragEvent, type ClipboardEvent, type KeyboardEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { UploadCloud, ChevronLeft, ChevronRight, Image as ImageIcon, Package, Save, Trash2, Star, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { buildSafeStoragePath, pathFromPublicUrl } from "@/lib/images";
import FeatureServiceButton from "@/components/services/feature-service-button";

interface Service {
  id: string;
  title: string;
  description: string;
  price: number | null;
  category: string;
  location: string | null;
  province?: string | null;
  city?: string | null;
  origin_province?: string | null;
  origin_city?: string | null;
  dest_province?: string | null;
  dest_city?: string | null;
  featured_until?: string | null;
  user_id: string;
}

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

const TRANSPORT_CATEGORY = "Transporte y Logística" as const;

// Lista estática base de categorías (igual a creación)
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

export default function ServiceEditForm({ service }: { service: Service }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Form state
  const [formData, setFormData] = useState({
    title: service.title,
    description: service.description,
    category: service.category,
    price: service.price as number | null,
    province: service.province || "",
    city: service.city || "",
    origin_province: service.origin_province || "",
    origin_city: service.origin_city || "",
    dest_province: service.dest_province || "",
    dest_city: service.dest_city || "",
  });

  const [cities, setCities] = useState<string[]>([]);
  const [originCities, setOriginCities] = useState<string[]>([]);
  const [destCities, setDestCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingOriginCities, setLoadingOriginCities] = useState(false);
  const [loadingDestCities, setLoadingDestCities] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Gallery state
  const [gallery, setGallery] = useState<{ id: string; url: string }[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const MAX_SIZE_MB = 5;
  const [maxFiles, setMaxFiles] = useState<number>(5);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [canFeature, setCanFeature] = useState<boolean>(true);

  const isTransport = formData.category === TRANSPORT_CATEGORY;
  const isFull = (gallery.length + pendingFiles.length) >= maxFiles;
  const isFeature = !!(service.featured_until && new Date(service.featured_until) > new Date());

  // Validaciones: bloquear números en título/descr (alineado con creación)
  const handleTitleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key && e.key.length === 1 && /[0-9]/.test(e.key)) e.preventDefault();
  };

  const deleteService = async () => {
    try {
      let ok = false;
      try {
        const mod = await import("../ui/confirm-modal");
        ok = await mod.default({
          title: "¿Eliminar servicio?",
          description: "Se eliminará el servicio y todas sus imágenes asociadas. Esta acción no se puede deshacer.",
          confirmText: "Eliminar definitivamente",
          cancelText: "Cancelar",
        });
      } catch {
        ok = typeof window !== "undefined" ? window.confirm("¿Eliminar este servicio y sus imágenes? Esta acción no se puede deshacer.") : true;
      }
      if (!ok) return;
      setDeleting(true);
      // Aseguramos tener la galería cargada
      await loadGallery();
      // Eliminar archivos del storage (best effort)
      const paths = gallery.map((g) => pathFromPublicUrl(g.url)).filter(Boolean) as string[];
      if (paths.length) {
        try { await supabase.storage.from("service-images").remove(paths); } catch {}
      }
      // Eliminar filas de imágenes
      try { await supabase.from("service_images").delete().eq("service_id", service.id); } catch {}
      // Eliminar servicio
      const { error } = await supabase.from("services").delete().eq("id", service.id).eq("user_id", service.user_id);
      if (error) throw error;
      toast.success("Servicio eliminado");
      router.push("/dashboard/services");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo eliminar el servicio");
    } finally { setDeleting(false); }
  };

  // Cargar permiso para destacar (desde plans)
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
        if (!planCode) { setCanFeature(true); return; }
        const { data: plan } = await supabase
          .from('plans')
          .select('can_feature')
          .eq('code', planCode)
          .maybeSingle();
        setCanFeature(Boolean((plan as any)?.can_feature ?? true));
      } catch { setCanFeature(true); }
    })();
  }, [supabase]);

  const handleFeature = async () => {
    try {
      if (isFeature) {
        // Quitar destacado
        setLoading(true);
        const { error } = await supabase
          .from('services')
          .update({ featured_until: null })
          .eq('id', service.id)
          .eq('user_id', service.user_id);
        if (error) throw error;
        toast.success("Servicio quitado de destacados");
      } else {
        if (!canFeature) { toast.error('Tu plan no permite destacar servicios'); return; }
        setLoading(true);
        // Destacar con 3 días por defecto (el backend valida costo/días)
        const res = await fetch('/api/services/feature', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ serviceId: service.id, days: 3 }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'No se pudo destacar el servicio');
        toast.success('Servicio destacado por 3 días');
      }
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || 'Error al modificar el servicio');
    } finally { setLoading(false); }
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
      setFormData((p) => ({ ...p, title: next }));
      requestAnimationFrame(() => {
        try { el.selectionStart = el.selectionEnd = start + sanitized.length; } catch {}
      });
    }
  };

  const loadGallery = useCallback(async () => {
    const { data } = await supabase
      .from("service_images")
      .select("id,url")
      .eq("service_id", service.id)
      .order("id", { ascending: true });
    setGallery((data as any) || []);
  }, [supabase, service.id]);

  useEffect(() => { (async () => { await loadGallery(); })(); }, [loadGallery]);

  // Categorías: combinamos estática + dinámicas para asegurar cambio válido
  useEffect(() => {
    (async () => {
      setLoadingCategories(true);
      try {
        const { data: cat } = await supabase
          .from("services")
          .select("category")
          .not("category", "is", null)
          .order("category", { ascending: true });
        let list = Array.from(new Set((cat || []).map((r: any) => String(r.category || "").trim()).filter(Boolean)));
        if (!list.length) {
          const { data: catData } = await supabase.from("categories").select("*");
          list = Array.from(new Set(((catData as any[]) || []).map(r => (r?.name ?? r?.title ?? r?.label ?? r?.slug ?? "").toString().replace(/[-_]/g, " ").trim()).filter(Boolean)));
        }
        // Fusionar con la lista estática, garantizando todas las categorías soporte
        const merged = Array.from(new Set([...(SERVICE_CATEGORIES || []), ...(list || []), service.category].filter(Boolean)));
        merged.sort((a, b) => a.localeCompare(b));
        setCategories(merged);
      } catch {
        const fallback = Array.from(new Set([...(SERVICE_CATEGORIES || []), service.category].filter(Boolean)));
        setCategories(fallback);
      } finally {
        setLoadingCategories(false);
      }
    })();
  }, [supabase, service.category]);

  // Carga de ciudades por provincia (general)
  async function fetchCities(prov: string, setter: (v: string[]) => void, setLoading: (v: boolean) => void) {
    if (!prov) { setter([]); return; }
    setLoading(true);
    try {
      const url = `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(prov)}&campos=nombre&orden=nombre&max=5000`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("No se pudieron cargar localidades");
      const json = await res.json();
      const list: string[] = Array.isArray(json?.localidades) ? json.localidades.map((l: any) => String(l.nombre)) : [];
      setter(list);
    } catch { setter([]); } finally { setLoading(false); }
  }

  useEffect(() => { if (!isTransport && formData.province) fetchCities(formData.province, setCities, setLoadingCities); }, [formData.province, isTransport]);
  useEffect(() => { if (isTransport && formData.origin_province) fetchCities(formData.origin_province, setOriginCities, setLoadingOriginCities); }, [formData.origin_province, isTransport]);
  useEffect(() => { if (isTransport && formData.dest_province) fetchCities(formData.dest_province, setDestCities, setLoadingDestCities); }, [formData.dest_province, isTransport]);

  // Gestión de imágenes
  const appendFiles = (newFiles: FileList | File[]) => {
    if (isFull) return;
    const all = Array.from(newFiles).filter((f) => f.type.startsWith("image/"));
    const tooBig = all.filter((f) => f.size > MAX_SIZE_MB * 1024 * 1024);
    if (tooBig.length) toast.error(`Algunas imágenes superan ${MAX_SIZE_MB}MB y fueron omitidas`);
    const accepted = all.filter((f) => f.size <= MAX_SIZE_MB * 1024 * 1024);
    setPendingFiles((prev) => {
      const remaining = Math.max(0, maxFiles - gallery.length - prev.length);
      const next = [...prev, ...accepted.slice(0, remaining)];
      if (accepted.length > remaining) toast.error(`Máximo ${maxFiles} imágenes por servicio`);
      return next;
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length) {
      appendFiles(files);
      e.target.value = "";
    }
  };

  function handleDragOver(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setIsDragging(false); }
  function handleDrop(e: DragEvent<HTMLDivElement>) { e.preventDefault(); setIsDragging(false); if (e.dataTransfer?.files?.length) appendFiles(e.dataTransfer.files); }

  const urlToPath = (url: string) => pathFromPublicUrl(url);

  const deleteImage = async (id: string, url: string) => {
    try {
      const ok = typeof window !== "undefined" ? window.confirm("¿Eliminar esta imagen?") : true;
      if (!ok) return;
      const path = urlToPath(url);
      if (path) {
        await supabase.storage.from("service-images").remove([path]);
      }
      await supabase.from("service_images").delete().eq("id", id).eq("service_id", service.id);
      setGallery((prev) => prev.filter((g) => g.id !== id));
      await loadGallery();
      toast.success("Imagen eliminada");
    } catch { toast.error("No se pudo eliminar la imagen"); }
  };

  const uploadImages = async () => {
    if (!pendingFiles.length) return;
    const urls: string[] = [];
    for (const f of pendingFiles) {
      const { path } = buildSafeStoragePath({ userId: service.user_id, file: f });
      const { error } = await supabase.storage.from("service-images").upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type || undefined });
      if (error) throw error;
      const { data } = supabase.storage.from("service-images").getPublicUrl(path);
      if (data?.publicUrl) urls.push(data.publicUrl);
    }
    if (urls.length) {
      const rows = urls.map((url) => ({ service_id: service.id, url }));
      await supabase.from("service_images").insert(rows as any);
    }
    setPendingFiles([]);
    await loadGallery();
  };

  const handleSave = async () => {
    // Validaciones de entrada básicas
    if (/[0-9]/.test((formData.title || ""))) {
      toast.error("El título no puede contener números");
      return;
    }
    if ((formData.description || "").length > 250) {
      toast.error("La descripción supera 250 caracteres");
      return;
    }

    try {
      setLoading(true);
      const payload: any = {
        title: (formData.title || "").trim(),
        description: (formData.description || "").trim(),
        category: (formData.category || "").trim(),
        price: formData.price === null || formData.price === undefined || formData.price === ("" as any) ? null : Number(formData.price),
      };
      if (isTransport) {
        payload.origin_province = formData.origin_province || null;
        payload.origin_city = formData.origin_city || null;
        payload.dest_province = formData.dest_province || null;
        payload.dest_city = formData.dest_city || null;
        payload.province = null;
        payload.city = null;
        payload.location = `${formData.origin_city}, ${formData.origin_province} → ${formData.dest_city}, ${formData.dest_province}`;
      } else {
        payload.province = formData.province || null;
        payload.city = formData.city || null;
        payload.origin_province = null;
        payload.origin_city = null;
        payload.dest_province = null;
        payload.dest_city = null;
        payload.location = `${formData.city}, ${formData.province}`;
      }

      const { error } = await supabase
        .from("services")
        .update(payload)
        .eq("id", service.id)
        .eq("user_id", service.user_id);
      if (error) throw error;

      await uploadImages();
      toast.success("Servicio actualizado");
      // Volver al listado del dashboard
      router.push("/dashboard/services");
      router.refresh();
    } catch (e: any) {
      toast.error(e?.message || "No se pudo actualizar el servicio");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6">
      {/* Galería */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Galería de imágenes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {gallery.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {gallery.map((img) => (
                <div key={img.id} className="relative z-0 group rounded-lg overflow-hidden border h-32">
                  <Image src={img.url} alt={service.title} fill className="object-cover pointer-events-none select-none" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); deleteImage(img.id, img.url); }}
                    disabled={deletingImageId === img.id}
                    className={`absolute top-1 right-1 z-20 inline-flex items-center rounded p-1 text-white pointer-events-auto opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 focus-visible:opacity-100 transition ${deletingImageId === img.id ? "bg-gray-400 cursor-wait" : "bg-red-600/80"}`}
                    aria-busy={deletingImageId === img.id}
                    aria-label="Eliminar imagen"
                    tabIndex={0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="w-full rounded-lg bg-muted flex items-center justify-center p-6 text-muted-foreground">
              <div className="text-center">
                <Package className="h-10 w-10 mx-auto mb-2" />
                <p className="text-sm">Sin imágenes</p>
              </div>
            </div>
          )}

          <div>
            <Label>Imágenes</Label>
            <div
              className={`flex flex-col items-center justify-center gap-3 rounded border-2 border-dashed p-8 text-sm ${(!isFull && isDragging) ? "border-orange-500 bg-orange-50" : "border-muted"} ${(isFull) ? "opacity-60 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isFull && fileInputRef.current?.click()}
              role="button"
              aria-disabled={isFull}
              tabIndex={isFull ? -1 : 0}
              onKeyDown={(e) => { if (isFull) return; if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
            >
              <UploadCloud className="h-8 w-8 text-[#f06d04]" />
              <p className="text-center text-muted-foreground">Arrastra y suelta imágenes aquí o</p>
              <Button type="button" variant="outline" disabled={isFull} className="bg-white text-[#f06d04] border border-[#f06d04] hover:bg-[#f06d04]/10">
                Seleccionar imágenes
              </Button>
              <input ref={fileInputRef} className="sr-only" type="file" accept="image/*" multiple disabled={isFull} onChange={handleFileInputChange} />
              <p className="text-[11px] text-muted-foreground">Formatos soportados: JPG, PNG, WEBP. Máx {maxFiles} imágenes, {MAX_SIZE_MB}MB c/u.</p>
            </div>

            {pendingFiles.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="group relative h-24 w-full cursor-zoom-in overflow-hidden rounded border" onClick={() => setPreviewIndex(i)}>
                    <Image src={URL.createObjectURL(f)} alt={f.name} fill className="object-cover" />
                    <button type="button" aria-label="Eliminar" className="absolute right-1 top-1 hidden rounded px-2 py-0.5 text-[11px] bg-red-600/10 text-red-800 hover:bg-red-600 hover:text-white group-hover:block transition-colors" onClick={(e) => { e.stopPropagation(); setPendingFiles((prev) => prev.filter((_, idx) => idx !== i)); }}>Eliminar</button>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[11px] text-muted-foreground">{gallery.length + pendingFiles.length} / {maxFiles} imágenes seleccionadas</div>

            {previewIndex !== null && pendingFiles[previewIndex] && (
              <Dialog open={previewIndex !== null} onOpenChange={(open) => !open && setPreviewIndex(null)}>
                <DialogContent className="sm:max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Vista previa</DialogTitle>
                  </DialogHeader>
                  <div className="relative w-full" style={{ minHeight: "50vh" }}>
                    <Image src={URL.createObjectURL(pendingFiles[previewIndex])} alt={pendingFiles[previewIndex].name} fill className="rounded bg-black object-contain" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <Button type="button" variant="outline" onClick={() => setPreviewIndex((idx) => (idx === null ? idx : (idx - 1 + pendingFiles.length) % pendingFiles.length))} disabled={pendingFiles.length <= 1}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                    </Button>
                    <div className="text-xs text-muted-foreground">{(previewIndex ?? 0) + 1} / {pendingFiles.length}</div>
                    <Button type="button" variant="outline" onClick={() => setPreviewIndex((idx) => (idx === null ? idx : (idx + 1) % pendingFiles.length))} disabled={pendingFiles.length <= 1}>
                      Siguiente <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Información básica */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Título del servicio <span className="text-red-600">*</span></Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              maxLength={20}
              inputMode="text"
              onKeyDown={handleTitleKeyDown}
              onBeforeInput={handleTitleBeforeInput}
              onPaste={handleTitlePaste}
            />
            <div className="text-xs text-muted-foreground">{(formData.title?.length ?? 0)} / 20 caracteres</div>
          </div>

          <div className="space-y-2">
            <Label>Descripción <span className="text-red-600">*</span></Label>
            <Textarea
              rows={5}
              maxLength={250}
              inputMode="text"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
            />
            <div className="text-[11px] text-muted-foreground">{(formData.description?.length ?? 0)} / 250 caracteres</div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label>Categoría</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData((p) => ({ ...p, category: v }))} disabled={loadingCategories}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingCategories ? "Cargando..." : "Selecciona"} />
                </SelectTrigger>
                <SelectContent position="popper" className="z-50">
                  {loadingCategories && <SelectItem value="__loading" disabled>Cargando...</SelectItem>}
                  {!loadingCategories && categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ubicación */}
          {formData.category !== TRANSPORT_CATEGORY ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Provincia</Label>
                <Select value={formData.province} onValueChange={(v) => setFormData((p) => ({ ...p, province: v, city: "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona provincia" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-50">
                    {AR_PROVINCES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Localidad</Label>
                <Select value={formData.city} onValueChange={(v) => setFormData((p) => ({ ...p, city: v }))} disabled={!formData.province || loadingCities}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCities ? "Cargando..." : (!formData.province ? "Selecciona provincia primero" : "Selecciona localidad")} />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-50">
                    {loadingCities && <SelectItem value="__loading" disabled>Cargando...</SelectItem>}
                    {!loadingCities && (cities.length ? cities.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>)) : (<SelectItem value="__empty" disabled>Sin localidades</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Provincia de salida</Label>
                <Select value={formData.origin_province} onValueChange={(v) => setFormData((p) => ({ ...p, origin_province: v, origin_city: "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona provincia" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-50">
                    {AR_PROVINCES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Label>Localidad de salida</Label>
                <Select value={formData.origin_city} onValueChange={(v) => setFormData((p) => ({ ...p, origin_city: v }))} disabled={!formData.origin_province || loadingOriginCities}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingOriginCities ? "Cargando..." : (!formData.origin_province ? "Selecciona provincia primero" : "Selecciona localidad")} />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-50">
                    {loadingOriginCities && <SelectItem value="__loading" disabled>Cargando...</SelectItem>}
                    {!loadingOriginCities && (originCities.length ? originCities.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>)) : (<SelectItem value="__empty" disabled>Sin localidades</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Provincia de llegada</Label>
                <Select value={formData.dest_province} onValueChange={(v) => setFormData((p) => ({ ...p, dest_province: v, dest_city: "" }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona provincia" />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-50">
                    {AR_PROVINCES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Label>Localidad de llegada</Label>
                <Select value={formData.dest_city} onValueChange={(v) => setFormData((p) => ({ ...p, dest_city: v }))} disabled={!formData.dest_province || loadingDestCities}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingDestCities ? "Cargando..." : (!formData.dest_province ? "Selecciona provincia primero" : "Selecciona localidad")} />
                  </SelectTrigger>
                  <SelectContent position="popper" className="z-50">
                    {loadingDestCities && <SelectItem value="__loading" disabled>Cargando...</SelectItem>}
                    {!loadingDestCities && (destCities.length ? destCities.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>)) : (<SelectItem value="__empty" disabled>Sin localidades</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Acciones se mueven al bloque inferior para replicar Productos */}
        </CardContent>
      </Card>

      {/* Precio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Precio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="price">Precio (ARS) <span className="text-muted-foreground">(opcional)</span></Label>
              <Input id="price" inputMode="decimal" placeholder="0,00" maxLength={10} value={formData.price ?? ""} onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value === "" ? null : Number(e.target.value.replace(/[^0-9.,-]/g, "").replace(",", ".")) }))} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado del servicio (Destacado) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estado del servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Badge variant={isFeature ? "default" : "secondary"}>
                  {isFeature ? "Destacado" : "Normal"}
                </Badge>
                {isFeature && (
                  <span className="text-sm text-muted-foreground">
                    hasta {new Date(service.featured_until!).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isFeature ? "Este servicio aparece en la sección de destacados" : "Haz que tu servicio aparezca en destacados"}
              </p>
              {!isFeature && !canFeature && (
                <p className="text-xs text-muted-foreground">Tu plan no permite destacar servicios actualmente.</p>
              )}
            </div>
            <FeatureServiceButton serviceId={service.id} featuredUntil={service.featured_until ?? null} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Botones de acción (idéntico a Productos) */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Button
          variant="destructive"
          size="sm"
          onClick={deleteService}
          disabled={loading || deleting}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {deleting ? "Eliminando..." : "Eliminar servicio"}
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={async () => { await handleSave(); }}
            disabled={loading}
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}
