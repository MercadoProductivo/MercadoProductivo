import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Package, ArrowLeft, Star, Tag } from "lucide-react";
import { ProductGallery } from "@/components/products/product-gallery";
import SellerInfoCard from "@/components/products/seller-info-card";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Service = {
  id: string;
  title: string;
  description: string;
  price: number | null;
  category: string;
  location: string | null;
  featured_until?: string | null;
  created_at: string;
  user_id: string;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: service } = await supabase
      .from("services")
      .select("id,title,description")
      .eq("id", id)
      .single();
    if (!service) return {};

    const { data: gallery } = await supabase
      .from("service_images")
      .select("url,id")
      .eq("service_id", service.id)
      .order("id", { ascending: true });
    const image = (gallery || []).find((g: any) => g?.url)?.url as string | undefined;

    const hdrs = await headers();
    const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
    const proto = hdrs.get("x-forwarded-proto") || "http";
    const baseUrl = host ? `${proto}://${host}` : "";
    const url = `${baseUrl}/services/${service.id}`;

    return {
      title: service.title,
      description: service.description,
      openGraph: {
        title: service.title,
        description: service.description,
        url,
        images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title: service.title,
        description: service.description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default async function PublicServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) notFound();

  const supabase = await createClient();
  const { data: service, error } = await supabase
    .from("services")
    .select(
      "id,title,description,price,category,location,featured_until,created_at,user_id"
    )
    .eq("id", id)
    .eq("published", true)
    .single();

  if (error || !service) {
    console.error("PublicServicePage service fetch error", error);
    notFound();
  }

  const isFeatured = Boolean(
    service.featured_until && new Date(service.featured_until) > new Date()
  );

  const price = (service.price == null || Number(service.price) === 0)
    ? "Consultar Precio"
    : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(service.price));

  const createdAt = new Date(service.created_at).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Cargar imágenes del servicio (usar Service Role si está disponible; fallback a cliente normal)
  let images: string[] = [];
  try {
    const supabaseAdmin = createAdminClient();
    const { data: gallery } = await supabaseAdmin
      .from("service_images")
      .select("url,id")
      .eq("service_id", service.id)
      .order("id", { ascending: true });
    images = (gallery || []).map((g: any) => g.url as string);
  } catch {
    try {
      const { data: gallery } = await supabase
        .from("service_images")
        .select("url,id")
        .eq("service_id", service.id)
        .order("id", { ascending: true });
      images = (gallery || []).map((g: any) => g.url as string);
    } catch { }
  }

  // Cargar perfil del vendedor desde endpoint público (consistente con productos)
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") || "http";
  const baseUrl = host ? `${proto}://${host}` : "";
  let seller: any = null;
  try {
    const res = await fetch(`${baseUrl}/api/public/sellers/${service.user_id}`, { cache: "no-store" });
    if (res.ok) {
      const payload = await res.json();
      seller = payload?.seller || null;
    }
  } catch (e) {
    console.error("Failed to fetch seller info", e);
  }

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" className="w-fit px-0 text-primary">
          <Link href="/services" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver a servicios
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Galería */}
        <div>
          <ProductGallery images={images} title={service.title} />
        </div>

        {/* Datos */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold sm:text-3xl">{service.title}</h1>
            {isFeatured && (
              <Badge className="bg-orange-500 text-white">
                <Star className="mr-1 h-3 w-3" /> Destacado
              </Badge>
            )}
          </div>

          <div className={`text-2xl font-bold ${price === 'Consultar' ? 'text-orange-600' : 'text-gray-900'}`}>{price}</div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {service.location || "Ubicación no especificada"}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-4 w-4" /> Publicado el {createdAt}
            </span>
            <span className="inline-flex items-center gap-1">
              <Tag className="h-4 w-4" /> {service.category}
            </span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Descripción</CardTitle>
              <CardDescription>
                Detalles del servicio proporcionados por el vendedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap leading-relaxed">{service.description}</p>
            </CardContent>
          </Card>

          {/* Perfil del vendedor */}
          {seller && (
            <SellerInfoCard
              productTitle={service.title}
              seller={{
                id: service.user_id,
                first_name: seller.first_name ?? null,
                last_name: seller.last_name ?? null,
                full_name: seller.full_name ?? null,
                company: seller.company ?? null,
                city: seller.city ?? null,
                province: seller.province ?? null,
                location: seller.location ?? null,
                avatar_url: seller.avatar_url ?? null,
                phone: seller.phone ?? null,
                created_at: seller.created_at ?? null,
                joined_at: seller.joined_at ?? null,
                plan_code: seller.plan_code ?? null,
                plan_label: seller.plan_label ?? (seller.plan_code || "Básico"),
                products_count: seller.products_count ?? 0,
                likes_count: seller.likes_count ?? 0,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
