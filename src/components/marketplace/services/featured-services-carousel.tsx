"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Heart, Share2 } from "lucide-react";
import {
  Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext
} from "@/components/ui/carousel";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import confirmModal from "@/components/ui/confirm-modal";

interface FeaturedService {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string | null;
  price: number | null;
  user_id: string;
  cover_url?: string | null;
}

export default function FeaturedServicesCarousel() {
  const [items, setItems] = useState<FeaturedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      try {
        const params = new URLSearchParams({ 
          page: "1", 
          pageSize: "30", 
          onlyFeatured: "true", 
          sortBy: "featured" 
        });
        const res = await fetch(`/api/public/services?${params.toString()}`, { cache: "no-store" });
        const json = await res.json();
        setItems(Array.isArray(json?.items) ? json.items : []);
      } finally {
        setLoading(false);
      }
    }
    load();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);
      } catch {}
    })();
  }, [supabase]);

  // Cargar estado de likes cuando hay items
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
    const ids = items.map(i => i.id);
    if (ids.length > 0) loadLikes(ids);
    return () => { active = false; };
  }, [items]);

  const toggleLike = async (svc: FeaturedService) => {
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

  const shareService = async (svc: FeaturedService) => {
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

  const formatPrice = (value: number | null) => {
    if (value == null || Number(value) === 0) return "Consultar";
    return new Intl.NumberFormat("es-AR", { 
      style: "currency", 
      currency: "ARS", 
      minimumFractionDigits: 0 
    }).format(Number(value));
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Servicios Destacados</h2>
          <div className="w-24 h-1 bg-orange-500 mx-auto mb-6"></div>
          <p className="text-gray-600">Cargando…</p>
        </div>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Servicios Destacados</h2>
          <div className="w-24 h-1 bg-orange-500 mx-auto mb-6"></div>
          <p className="text-gray-600">No hay servicios destacados en este momento.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="destacados" className="pt-10 pb-20 bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Servicios Destacados</h2>
          <div className="w-24 h-1 bg-orange-500 mx-auto" />
        </div>

        <div className="relative">
          <Carousel opts={{ align: "start", loop: false }}>
            <CarouselContent className="pb-4 sm:pb-6 md:pb-8">
              {items.map((svc) => (
                <CarouselItem key={svc.id} className="sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 pb-6 sm:pb-8 md:pb-10">
                  <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md overflow-hidden h-full flex flex-col">
                    <div className="relative">
                      <Badge className="absolute top-3 left-3 z-10 bg-orange-500 hover:bg-orange-600">
                        <Star className="h-3 w-3 mr-1" />
                        Destacado
                      </Badge>
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
                      <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                        {svc.cover_url ? (
                          <div className="relative w-full h-full">
                            <Image src={svc.cover_url} alt={svc.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-center text-gray-400">
                            <div>
                              <Star className="h-8 w-8 mx-auto mb-1" />
                              <span className="text-xs font-medium">Servicio</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <CardContent className="p-4 flex flex-col flex-1">
                      <Badge variant="secondary" className="mb-2 text-xs">{svc.category}</Badge>
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">{svc.title}</h3>
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="truncate">{svc.location || "Ubicación no especificada"}</span>
                      </div>
                      <div className="mb-4">
                        <span className="text-2xl font-bold text-orange-600">{formatPrice(svc.price)}</span>
                      </div>
                      <div className="mt-auto">
                        <Button asChild className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                          <Link href={`/services/${svc.id}`}>Ver servicio</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </div>
    </section>
  );
}
