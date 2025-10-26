"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Heart, Share2 } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import confirmModal from "@/components/ui/confirm-modal";

interface FeaturedProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  quantity_value: number;
  quantity_unit: string;
  category: string;
  location: string;
  user_id: string;
  primaryImageUrl?: string | null;
}

export default function FeaturedProductsCarousel() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  // Cargar productos destacados
  useEffect(() => {
    async function fetchFeaturedProducts() {
      try {
        const params = new URLSearchParams({
          page: "1",
          pageSize: "30",
          onlyFeatured: "true",
          sortBy: "featured",
        });
        const res = await fetch(`/api/public/products?${params.toString()}`, { method: "GET", cache: "no-store" });
        if (!res.ok) {
          throw new Error(`API error ${res.status}`);
        }
        const json = await res.json();
        const items: FeaturedProduct[] = Array.isArray(json?.items) ? json.items : [];
        setProducts(items);
      } catch (error) {
        console.error('Error fetching featured products:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFeaturedProducts();
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);
      } catch {}
    })();
  }, [supabase]);

  // Cargar likes cuando se cargan productos
  useEffect(() => {
    let active = true;
    async function loadLikes(ids: string[]) {
      try {
        const results = await Promise.all(ids.map(async (id) => {
          try {
            const r = await fetch(`/api/product-likes/${id}`, { cache: "no-store" });
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
    const ids = products.map(p => p.id);
    if (ids.length > 0) loadLikes(ids);
    return () => { active = false; };
  }, [products]);

  const toggleLike = async (p: FeaturedProduct) => {
    try {
      const res = await fetch(`/api/product-likes/${p.id}`, { method: "POST" });
      if (res.status === 401) {
        const ok = await confirmModal({
          title: "Inicia sesión para dar like",
          description: "Debes iniciar sesión o registrarte para poder dar like a este producto.",
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
        toast.error("Producto no encontrado");
        return;
      }
      if (res.status === 400) {
        let err: any = null;
        try { err = await res.json(); } catch {}
        if (err?.error === "SELF_LIKE_FORBIDDEN") {
          await confirmModal({
            title: "Acción no permitida",
            description: "No puedes dar like a tu propio producto.",
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
        if (json.liked) s.add(p.id); else s.delete(p.id);
        return s;
      });
    } catch {}
  };

  const shareProduct = async (p: FeaturedProduct) => {
    try {
      const url = `${window.location.origin}/products/${p.id}`;
      const isOwner = currentUserId && currentUserId === p.user_id;
      const text = isOwner
        ? `Te invito a conocer mi producto "${p.title}" en Mercado Productivo. ¡Sumate y descubrí más!`
        : `Encontré este producto "${p.title}" en Mercado Productivo. ¡Echale un vistazo!`;
      if (navigator.share) {
        try {
          await navigator.share({ title: p.title, text, url });
        } catch (shareError) {
          console.log("Error al compartir con Web Share API", shareError);
          toast.error("No se pudo compartir");
        }
      } else {
        toast.error("La opción de compartir no está disponible en tu navegador.");
      }
    } catch (e) {
      console.error("share featured product error", e);
      toast.error("No se pudo compartir");
    }
  };

  // Carrusel manual con flechas; sin autoplay

  const formatPrice = (price: number | null | undefined) => {
    if (price == null || Number(price) === 0) return 'Consultar';
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(Number(price));
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Productos Destacados
            </h2>
            <div className="w-24 h-1 bg-orange-500 mx-auto mb-6"></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border animate-pulse">
                <div className="aspect-[4/3] bg-gray-200 rounded-t-lg"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Productos Destacados
          </h2>
          <div className="w-24 h-1 bg-orange-500 mx-auto mb-6"></div>
          <p className="text-gray-600">No hay productos destacados en este momento.</p>
        </div>
      </section>
    );
  }

  return (
    <section id="destacados" className="pt-10 pb-20 bg-gradient-to-b from-orange-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Productos Destacados
          </h2>
          <div className="w-24 h-1 bg-orange-500 mx-auto" />
        </div>

        {/* Carrusel con flechas (sin autoplay) */}
        <div className="relative">
          <Carousel opts={{ align: "start", loop: false }}>
            <CarouselContent className="pb-4 sm:pb-6 md:pb-8">
              {products.map((product) => (
                <CarouselItem key={product.id} className="sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 pb-6 sm:pb-8 md:pb-10">
                  <div className="">
                    <Card className="group hover:shadow-xl transition-all duration-300 border-0 shadow-md overflow-hidden h-full flex flex-col">
                      <div className="relative">
                        {/* Badge destacado */}
                        <Badge className="absolute top-3 left-3 z-10 bg-orange-500 hover:bg-orange-600">
                          <Star className="h-3 w-3 mr-1" />
                          Destacado
                        </Badge>
                        {/* Acciones */}
                        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                            onClick={() => toggleLike(product)}
                          >
                            <Heart
                              className={cn(
                                "h-4 w-4",
                                liked.has(product.id) ? "fill-red-500 text-red-500" : "text-gray-600"
                              )}
                            />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                            onClick={() => shareProduct(product)}
                          >
                            <Share2 className="h-4 w-4 text-gray-600" />
                          </Button>
                        </div>
                        {/* Imagen */}
                        <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                          {product.primaryImageUrl ? (
                            <Image
                              src={product.primaryImageUrl}
                              alt={product.title}
                              width={300}
                              height={200}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                              <div className="text-center text-orange-400">
                                <Star className="h-8 w-8 mx-auto mb-1" />
                                <span className="text-xs font-medium">Destacado</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <CardContent className="p-4 flex flex-col flex-1">
                        <Badge variant="secondary" className="mb-2 text-xs">
                          {product.category}
                        </Badge>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-orange-600 transition-colors">
                          {product.title}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 mb-3">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="truncate">{product.location || 'Ubicación no especificada'}</span>
                        </div>
                        <div className="mb-4">
                          <div>
                            <span className="text-2xl font-bold text-orange-600">{formatPrice(product.price)}</span>
                            {formatPrice(product.price) !== 'Consultar' && (
                              <span className="text-sm text-gray-500 ml-1">/ {product.quantity_unit}</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{product.quantity_value} {product.quantity_unit} disp.</div>
                        </div>
                        <div className="mt-auto flex gap-2">
                          <Button asChild className="flex-1 bg-orange-500 hover:bg-orange-600">
                            <Link href={`/products/${product.id}`}>
                              Ver Producto
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
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
