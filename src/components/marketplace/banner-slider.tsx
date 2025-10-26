"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const bannerSlides = [
  {
    id: 1,
    title: "Conectamos Vendedores y Compradores",
    subtitle: "La plataforma líder del sector agroindustrial",
    description: "Descubre productos frescos directamente del campo a tu mesa",
    cta: "Explorar Productos",
    ctaLink: "#productos"
  },
  {
    id: 2,
    title: "Productos Destacados del Mes",
    subtitle: "Calidad garantizada",
    description: "Los mejores productos seleccionados por nuestros expertos",
    cta: "Ver Destacados",
    ctaLink: "#destacados"
  },
  {
    id: 3,
    title: "Únete a Nuestra Comunidad",
    subtitle: "Más de 1000 vendedores confían en nosotros",
    description: "Forma parte del marketplace agroindustrial más grande",
    cta: "Registrarse",
    ctaLink: "/auth/register"
  }
];

export default function BannerSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [slideImages, setSlideImages] = useState<(string | null)[]>([null, null, null]);
  const [loaded, setLoaded] = useState<boolean[]>(Array(bannerSlides.length).fill(false));

  // Detectar sesión para ocultar botón de registro si el usuario está logueado
  useEffect(() => {
    const supabase = createClient();
    let unsub: { unsubscribe: () => void } | null = null;
    supabase.auth.getSession().then(({ data }) => setIsLoggedIn(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    unsub = data.subscription;
    return () => {
      unsub?.unsubscribe();
    };
  }, []);

  // Cargar imágenes del endpoint público que entrega URLs firmadas
  useEffect(() => {
    const load = async () => {
      try {
        const params = new URLSearchParams({ limit: String(bannerSlides.length), folder: "imagessite" });
        const res = await fetch(`/api/public/site/banners?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          console.error("[BannerSlider] Error HTTP al obtener banners:", res.status, res.statusText);
          setSlideImages([null, null, null]);
          return;
        }
        const json = await res.json();
        const images: string[] = Array.isArray(json?.images) ? json.images : [];
        const normalized = Array.from({ length: bannerSlides.length }, (_, i) => images[i] ?? null);
        setSlideImages(normalized);
      } catch (e) {
        console.error("[BannerSlider] Error inesperado al cargar banners:", e);
        setSlideImages([null, null, null]);
      }
    };
    load();
  }, []);

  // Preload de imágenes y marcar como cargadas
  useEffect(() => {
    const next = Array(bannerSlides.length).fill(false) as boolean[];
    slideImages.forEach((src, idx) => {
      if (!src) return; // se queda en false => shimmer visible
      const img = new Image();
      img.onload = () => {
        setLoaded(prev => {
          const copy = prev.slice();
          copy[idx] = true;
          return copy;
        });
      };
      img.onerror = () => {
        // mantener false para shimmer
      };
      img.src = src;
    });
    // reset cuando cambia el set de imágenes
    setLoaded(next);
  }, [slideImages]);

  // Auto-play del slider
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  // Navegación manual y dots eliminados por solicitud de UI.

  return (
    <section className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden bg-gradient-to-r from-orange-50 to-orange-100">
      {/* Slides */}
      <div className="relative w-full h-full">
        {bannerSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out",
              index === currentSlide ? "opacity-100" : "opacity-0"
            )}
            style={{
              ...(slideImages[index] ? { backgroundImage: `url(${slideImages[index]})` } : {}),
              backgroundSize: "cover",
              backgroundPosition: "center",
              willChange: "opacity",
            }}
          >
            {/* Shimmer mientras no carga la imagen */}
            {(!loaded[index] || !slideImages[index]) && (
              <div className="absolute inset-0 z-[5] animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
            )}
            {/* Background con overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black/30 z-10" />
            
            {/* Contenido */}
            <div className="relative z-20 flex items-center justify-center h-full px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto text-center text-white">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">
                  {slide.title}
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl mb-2 text-orange-200">
                  {slide.subtitle}
                </p>
                <p className="text-base sm:text-lg mb-8 max-w-2xl mx-auto opacity-90">
                  {slide.description}
                </p>
                {/* CTA removido por solicitud: no mostrar botones en los banners */}
              </div>
            </div>

            {/* Patrón decorativo */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-20 h-20 border-2 border-white rounded-full" />
              <div className="absolute top-32 right-20 w-16 h-16 border-2 border-white rounded-full" />
              <div className="absolute bottom-20 left-32 w-12 h-12 border-2 border-white rounded-full" />
            </div>
          </div>
        ))}
      </div>
      
    </section>
  );
}
