"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const SERVICE_BANNER_IMAGES: (string | null)[] = [
  "https://glheldpzeacnogprdyzm.supabase.co/storage/v1/object/public/site/imagessite/acopio.png",
  "https://glheldpzeacnogprdyzm.supabase.co/storage/v1/object/public/site/imagessite/servicios%20financieros.png",
  "https://glheldpzeacnogprdyzm.supabase.co/storage/v1/object/public/site/imagessite/Transporte.webp",
];

const slides = [
  { id: 1, title: "Conectá con proveedores de servicios", subtitle: "Especialistas del agro", description: "Profesionales y empresas para cada necesidad", cta: "Explorar Servicios", ctaLink: "#servicios" },
  { id: 2, title: "Servicios Destacados del Mes", subtitle: "Confianza y trayectoria", description: "Los mejores valorados por la comunidad", cta: "Ver Destacados", ctaLink: "#destacados" },
  { id: 3, title: "Ofrece tus servicios", subtitle: "Vende tu experiencia", description: "Llega a más clientes del sector", cta: "Crear cuenta", ctaLink: "/auth/register" },
];

export default function ServicesBannerSlider() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [loaded, setLoaded] = useState<boolean[]>(Array(slides.length).fill(false));

  useEffect(() => {
    if (!isAutoPlaying) return;
    const id = setInterval(() => setCurrentSlide(p => (p + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, [isAutoPlaying]);

  // Preload de imágenes y marcar como cargadas por índice
  useEffect(() => {
    const next = Array(slides.length).fill(false) as boolean[];
    SERVICE_BANNER_IMAGES.forEach((src, idx) => {
      if (!src) return; // shimmer permanece
      const img = new Image();
      img.onload = () => {
        setLoaded(prev => {
          const copy = prev.slice();
          copy[idx] = true;
          return copy;
        });
      };
      img.onerror = () => { /* mantener shimmer */ };
      img.src = src;
    });
    setLoaded(next);
  }, []);

  return (
    <section className="relative w-full h-[400px] md:h-[500px] lg:h-[600px] overflow-hidden bg-gradient-to-r from-orange-50 to-orange-100">
      <div className="relative w-full h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={cn("absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out", index === currentSlide ? "opacity-100" : "opacity-0")}
            style={{
              ...(SERVICE_BANNER_IMAGES[index] ? { backgroundImage: `url(${SERVICE_BANNER_IMAGES[index]})` } : {}),
              backgroundSize: "cover",
              backgroundPosition: "center",
              willChange: "opacity",
            }}
          >
            {/* Shimmer mientras no carga la imagen */}
            {(!loaded[index] || !SERVICE_BANNER_IMAGES[index]) && (
              <div className="absolute inset-0 z-[5] animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black/30 z-10" />
            <div className="relative z-20 flex items-center justify-center h-full px-4 sm:px-6 lg:px-8">
              <div className="max-w-4xl mx-auto text-center text-white">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 leading-tight">{slide.title}</h1>
                <p className="text-lg sm:text-xl md:text-2xl mb-2 text-orange-200">{slide.subtitle}</p>
                <p className="text-base sm:text-lg mb-8 max-w-2xl mx-auto opacity-90">{slide.description}</p>
                {/* CTA removido por solicitud: no mostrar botones en los banners */}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
