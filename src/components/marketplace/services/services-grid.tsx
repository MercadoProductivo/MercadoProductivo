"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Package, Clock, Star, Heart, Share2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ServiceFilters } from "./service-filters";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationEllipsis
} from "@/components/ui/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import confirmModal from "@/components/ui/confirm-modal";

interface ServiceItem {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number | null;
  user_id: string;
  created_at: string;
  featured_until?: string | null;
  location?: string | null;
  cover_url?: string | null;
  profiles?: {    first_name?: string;
    last_name?: string;
    city?: string;
    province?: string;
    company?: string;
    plan_code?: string;
  };
}

export default function ServicesGrid({
  filters, onServicesCountChange, sellerId, excludeServiceId, excludeSellerId, 
  variant = "default", pageSize, showPagination = true
}: {
  filters: ServiceFilters;
  onServicesCountChange: (count: number) => void;
  sellerId?: string;
  excludeServiceId?: string;
  excludeSellerId?: string;
  variant?: "default" | "comfortable" | "compact";
  pageSize?: number;
  showPagination?: boolean;
}) {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const DEFAULT_PAGE_SIZE = 12;
  const PAGE_SIZE = pageSize ?? DEFAULT_PAGE_SIZE;
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const pageCacheRef = useRef<Record<number, ServiceItem[]>>({});
  const sectionTopRef = useRef<HTMLDivElement | null>(null);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);
      } catch {}
    })();
  }, [supabase]);

  // Cargar estado de likes para los servicios visibles
  useEffect(() => {
    let active = true;
    async function loadLikes(ids: string[]) {
      try {
        const results = await Promise.all(ids.map(async (id) => {
          try {
            const r = await fetch(`/api/service-likes/${id}`, { cache: "no-store" });
            if (!r.ok) return { id, liked: false };
            const j = await r.json();
            return { id, liked: !!j.liked };
          } catch {
            return { id, liked: false };
          }
        }));
        if (!active) return;
        const s = new Set<string>();
        for (const it of results) if (it.liked) s.add(it.id);
        setLiked(s);
      } catch {}
    }
    const ids = services.map(s => s.id);
    if (ids.length > 0) loadLikes(ids);
    return () => { active = false; };
  }, [services]);

  const loadServices = useCallback(async ({ 
    reset, page, pageSize 
  }: { 
    reset: boolean; 
    page: number; 
    pageSize: number; 
  }) => {
    try {
      if (reset) {
        const cached = pageCacheRef.current[page];
        if (!cached) setLoading(true);
        else { setServices(cached); setLoading(false); }
        if (page === 1) setPage(1);
      }

      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      params.set("minPrice", String(filters.minPrice ?? 0));
      params.set("maxPrice", String(filters.maxPrice ?? 999999999));
      if (filters.location) params.set("location", filters.location);
      if (filters.sortBy) params.set("sortBy", filters.sortBy);
      params.set("onlyFeatured", String(!!filters.onlyFeatured));
      if (sellerId) params.set("sellerId", sellerId);
      if (excludeServiceId) params.set("excludeServiceId", excludeServiceId);
      if (excludeSellerId) params.set("excludeSellerId", excludeSellerId);

      const res = await fetch(`/api/public/services?${params.toString()}`, { method: "GET" });
      const json = await res.json();
      const items: ServiceItem[] = json.items || [];
      const total: number = json.total ?? 0;
      const apiHasMore: boolean = json.hasMore ?? false;

      setServices(items);
      pageCacheRef.current[page] = items;
      setHasMore(apiHasMore);

      if (reset) {
        setTotal(total);
        onServicesCountChange(total);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, onServicesCountChange, sellerId, excludeServiceId, excludeSellerId]);

  useEffect(() => {
    pageCacheRef.current = {};
    loadServices({ reset: true, page: 1, pageSize: PAGE_SIZE });
  }, [filters, loadServices, PAGE_SIZE]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const goToPage = (n: number) => {
    if (n < 1 || n > totalPages || n === page) return;
    setPage(n);
    const cached = pageCacheRef.current[n];
    if (cached) { setServices(cached); setLoading(false); }
    if (typeof window !== "undefined") {
      const el = sectionTopRef.current;
      if (el) {
        const headerOffset = 90;
        const y = el.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
      }
    }
    loadServices({ reset: true, page: n, pageSize: PAGE_SIZE });
  };

  const isFeatured = (svc: ServiceItem) => Boolean(svc.featured_until && new Date(svc.featured_until) > new Date());
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" });
  const formatPrice = (value: number | null) => !value && value !== 0
    ? "Consultar"
    : value === 0
      ? "Consultar"
      : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(value);

  const getSellerName = (svc: ServiceItem) => {
    const profile = svc.profiles;
    if (profile?.company && profile.company.trim()) return profile.company;
    const first = (profile?.first_name || '').trim();
    const last = (profile?.last_name || '').trim();
    const full = `${first} ${last}`.trim();
    if (full) return full;
    return 'Vendedor';
  };

  const toggleLike = async (svc: ServiceItem) => {
    try {
      const res = await fetch(`/api/service-likes/${svc.id}`, { method: "POST" });
      if (res.status === 401) {
        const ok = await confirmModal({
          title: "Inicia sesión para dar like",
          description: "Debes iniciar sesión o registrarte para poder dar like a este servicio.",
          confirmText: "Ir a registrarme",
          cancelText: "Cancelar",
        });
        if (ok) {
          const url = typeof window !== "undefined" ? window.location.pathname : "/";
          window.location.href = `/auth/register?redirect=${encodeURIComponent(url)}`;
        }
        return;
      }
      if (res.status === 404) {
        toast.error("Servicio no encontrado");
        return;
      }
      if (res.status === 400) {
        let err: any = null;
        try { err = await res.json(); } catch {}
        if (err?.error === "SELF_LIKE_FORBIDDEN") {
          await confirmModal({
            title: "Acción no permitida",
            description: "No puedes dar like a tu propio servicio.",
            confirmText: "Entendido",
            cancelText: "Cerrar",
          });
        }
        return;
      }
      if (!res.ok) {
        toast.error("No se pudo actualizar el like");
        return;
      }
      const json = await res.json();
      setLiked(prev => {
        const s = new Set(prev);
        if (json.liked) s.add(svc.id); else s.delete(svc.id);
        return s;
      });
    } catch {}
  };

  const shareService = async (svc: ServiceItem) => {
    try {
      const url = `${window.location.origin}/services/${svc.id}`;
      const isOwner = currentUserId && currentUserId === svc.user_id;
      const text = isOwner
        ? `Te invito a conocer mi servicio "${svc.title}" en Mercado Productivo. ¡Sumate y descubrí más!`
        : `Encontré este servicio "${svc.title}" en Mercado Productivo. ¡Echale un vistazo!`;
      
      // Compartir usando Web Share API con mensaje y URL
      if (navigator.share) {
        try {
          await navigator.share({
            title: svc.title,
            text,
            url,
          });
        } catch (shareError) {
          console.log("Error al compartir con Web Share API", shareError);
          toast.error("No se pudo compartir");
        }
      } else {
        toast.error("La opción de compartir no está disponible en tu navegador.");
      }
    } catch (e) {
      console.error("shareService error", e);
      toast.error("No se pudo compartir");
    }
  };

  if (loading) {
    return (
      <div className={cn(
        variant === "compact" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
          : variant === "comfortable" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
        "items-stretch"
      )}>
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <Card key={i} className="overflow-hidden h-full">
            <div className={cn("w-full", variant === "compact" ? "aspect-square" : "aspect-[4/3]")} />
            <CardContent className={cn("space-y-3", variant === "compact" ? "p-3" : "p-4")}>
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
              <div className={cn(variant === "compact" ? "h-8" : "h-10", "w-full")} />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No se encontraron servicios</h3>
        <p className="text-gray-600 mb-6">Ajustá los filtros para encontrar lo que buscás</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Recargar página</Button>
      </div>
    );
  }

  return (
    <div ref={sectionTopRef} className="space-y-8">
      <div className={cn(
        variant === "compact" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
          : variant === "comfortable" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-5"
          : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6",
        "items-stretch"
      )}>
        {services.map((svc) => (
          <Card key={svc.id} className={cn("group hover:shadow-xl transition-all duration-300 border-0 shadow-md overflow-hidden h-full flex flex-col", variant === "compact" && "text-sm")}>
            <div className="relative">
              <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
                {isFeatured(svc) && (
                  <Badge className="bg-orange-500 hover:bg-orange-600">
                    <Star className="h-3 w-3 mr-1" />
                    Destacado
                  </Badge>
                )}
                <Badge variant="secondary" className="text-[10px]">{svc.category}</Badge>
              </div>
              {variant !== "compact" && (
                <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                    onClick={() => toggleLike(svc)}
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4",
                        liked.has(svc.id) ? "fill-red-500 text-red-500" : "text-gray-600"
                      )}
                    />
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                    onClick={() => shareService(svc)}
                  >
                    <Share2 className="h-4 w-4 text-gray-600" />
                  </Button>
                </div>
              )}
              <div className={cn("overflow-hidden bg-gray-100", variant === "compact" ? "aspect-square" : "aspect-[4/3]")}> 
                {svc.cover_url ? (
                  <div className="relative w-full h-full">
                    <Image src={svc.cover_url} alt={svc.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-center text-gray-300">
                    <div>
                      <Package className={cn("mx-auto mb-2", variant === "compact" ? "h-8 w-8" : "h-12 w-12")} />
                      <span className={cn(variant === "compact" ? "text-xs" : "text-sm")}>Sin imagen</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <CardContent className={cn(variant === "compact" ? "p-3" : "p-4", "flex flex-col flex-1")}>
              <h3 className={cn("font-semibold mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors", variant === "compact" ? "text-base" : "text-lg")}>
                {svc.title}
              </h3>
              <div className={cn("space-y-1", "mb-3")}>
                <div className={cn("flex items-center text-gray-500", "text-sm")}>
                  <User className="h-4 w-4 mr-1" />
                  <span className="truncate">{getSellerName(svc)}</span>
                </div>
                <div className={cn("flex items-center text-gray-500", "text-sm")}>
                  <MapPin className="h-4 w-4 mr-1" />
                  <span className="truncate">{svc.location || "Ubicación no especificada"}</span>
                </div>
              </div>
              <div className="mb-3">
                <span className={cn("font-bold text-orange-600", "text-2xl")}>{formatPrice(svc.price)}</span>
              </div>
              {/* Fecha de publicación (antes del CTA) */}
              <div className="flex items-center text-xs text-gray-400 mb-3">
                <Clock className="h-3 w-3 mr-1" />
                Publicado {formatDate(svc.created_at)}
              </div>
              {/* CTA */}
              <div className="flex gap-2 mt-auto">
                <Button asChild className="flex-1 bg-orange-500 hover:bg-orange-600">
                  <Link href={`/services/${svc.id}`}>Ver servicio</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Paginación (shadcn) */}
      {showPagination && totalPages >= 1 && (
        <Pagination className="mt-4">
          <PaginationContent className="bg-white border rounded-full p-1 shadow-sm">
            <PaginationItem>
              <PaginationLink
                href="#"
                className={cn(page === 1 ? "pointer-events-none opacity-50" : "gap-1 pl-2.5 pr-3 rounded-full")}
                onClick={(e) => {
                  e.preventDefault();
                  goToPage(page - 1);
                }}
                size="default"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </PaginationLink>
            </PaginationItem>

            {/* Números con elipsis */}
            {(() => {
              const items: React.ReactNode[] = [];
              const pushPage = (p: number) =>
                items.push(
                  <PaginationItem key={p}>
                    <PaginationLink
                      href="#"
                      isActive={p === page}
                      size="icon"
                      className={p === page ? "bg-orange-500 text-white hover:bg-orange-600 border-orange-500" : ""}
                      onClick={(e) => {
                        e.preventDefault();
                        goToPage(p);
                      }}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                );

              // Siempre mostrar página 1
              pushPage(1);

              // Elipsis después de 1
              const start = Math.max(2, page - 1);
              const end = Math.min(totalPages - 1, page + 1);
              if (start > 2) {
                items.push(
                  <PaginationItem key="start-ellipsis">
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }

              // Ventana alrededor de la actual
              for (let p = start; p <= end; p++) {
                pushPage(p);
              }

              // Elipsis antes del final
              if (end < totalPages - 1) {
                items.push(
                  <PaginationItem key="end-ellipsis">
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }

              // Última página si es mayor a 1
              if (totalPages > 1) {
                pushPage(totalPages);
              }

              return items;
            })()}

            <PaginationItem>
              <PaginationLink
                href="#"
                className={cn(page === totalPages ? "pointer-events-none opacity-50" : "gap-1 pr-2.5 pl-3 rounded-full")}
                onClick={(e) => {
                  e.preventDefault();
                  goToPage(page + 1);
                }}
                size="default"
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
