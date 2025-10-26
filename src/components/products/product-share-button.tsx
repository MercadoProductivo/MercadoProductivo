"use client";

import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props {
  productId: string;
  productTitle: string;
  sellerId: string;
  className?: string;
  size?: "sm" | "default" | "lg" | null;
}

export default function ProductShareButton({ productId, productTitle, sellerId, className, size = "sm" }: Props) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id ?? null);
      } catch {}
    })();
  }, [supabase]);

  const onShare = async () => {
    try {
      const url = `${window.location.origin}/products/${productId}`;
      const isOwner = currentUserId && currentUserId === sellerId;
      const text = isOwner
        ? `Te invito a conocer mi producto "${productTitle}" en Mercado Productivo. ¡Sumate y descubrí más!`
        : `Encontré este producto "${productTitle}" en Mercado Productivo. ¡Echale un vistazo!`;
      
      // Compartir usando Web Share API con mensaje y URL
      if (navigator.share) {
        try {
          await navigator.share({
            title: productTitle,
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
      console.error("share product detail error", e);
      toast.error("No se pudo compartir");
    }
  };

  return (
    <Button
      type="button"
      size={size || undefined}
      variant="secondary"
      className={className}
      onClick={onShare}
    >
      <Share2 className="h-4 w-4 mr-2" /> Compartir
    </Button>
  );
}
