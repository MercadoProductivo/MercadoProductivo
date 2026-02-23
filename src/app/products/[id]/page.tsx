import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductGallery } from "@/components/products/product-gallery";
import { CalendarDays, MapPin, Package, ArrowLeft, Star, Tag } from "lucide-react";
import { RelatedProductsCarousel } from "@/components/marketplace/related-products-carousel";
import SimilarProducts from "@/components/products/similar-products";
import SellerInfoCard from "@/components/products/seller-info-card";
import type { Metadata } from "next";
import ProductShareButton from "@/components/products/product-share-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  location: string;
  quantity_value: number;
  quantity_unit: string;
  featured_until?: string | null;
  created_at: string;
  user_id: string;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // ✅ Paralelizar queries en generateMetadata
    const [
      { data: product },
      { data: gallery },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id,title,description")
        .eq("id", id)
        .single(),
      supabase
        .from("product_images")
        .select("url,id")
        .eq("product_id", id)
        .order("id", { ascending: true })
        .limit(1),
    ]);

    if (!product) return {};

    const image = gallery?.[0]?.url as string | undefined;
    const url = `/products/${product.id}`;

    return {
      title: product.title,
      description: product.description,
      openGraph: {
        title: product.title,
        description: product.description ?? undefined,
        url,
        images: image ? [{ url: image, width: 1200, height: 630 }] : undefined,
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title: product.title,
        description: product.description ?? undefined,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    return {};
  }
}

export default async function PublicProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) notFound();

  const supabase = await createClient();

  // ✅ Paralelizar queries para mejor performance
  const [
    { data: product, error: productError },
    { data: gallery },
  ] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id,title,description,price,category,location,quantity_value,quantity_unit,featured_until,created_at,user_id"
      )
      .eq("id", id)
      .eq("published", true)
      .single(),
    supabase
      .from("product_images")
      .select("url,id")
      .eq("product_id", id)
      .order("id", { ascending: true }),
  ]);

  if (productError || !product) {
    console.error("PublicProductPage product fetch error", productError);
    notFound();
  }

  const isFeatured = Boolean(
    product.featured_until && new Date(product.featured_until) > new Date()
  );

  const price = (product.price == null || Number(product.price) === 0)
    ? "Consultar Precio"
    : Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(product.price));

  const qty = `${Number(product.quantity_value)} ${product.quantity_unit}`;
  const createdAt = new Date(product.created_at as string).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const images = (gallery || []).map((g: any) => g.url as string);

  // ✅ Paralelizar queries del vendedor y productos relacionados
  const [
    { data: seller },
    { data: also },
  ] = await Promise.all([
    // Query directa al perfil en vez de HTTP fetch
    supabase
      .from("profiles")
      .select(
        "id,first_name,last_name,full_name,company,city,province,avatar_url,phone,plan_code,updated_at"
      )
      .eq("id", product.user_id as string)
      .maybeSingle(),
    // Productos del mismo vendedor
    supabase
      .from("products")
      .select("id,title,price,quantity_unit,category")
      .eq("user_id", product.user_id as string)
      .eq("published", true)
      .neq("id", product.id as string)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  // Cargar imágenes de productos relacionados
  let relatedItems: Array<{
    id: string;
    title: string;
    price: number;
    quantity_unit: string;
    category: string;
    product_images?: { url: string }[];
  }> = [];

  if (also && also.length > 0) {
    const ids = also.map((p: any) => p.id);
    const { data: pics } = await supabase
      .from("product_images")
      .select("product_id,url,id")
      .in("product_id", ids)
      .order("id", { ascending: true });

    const coverById = new Map<string, string>();
    for (const row of pics || []) {
      const pid = String((row as any).product_id);
      if (!coverById.has(pid) && row?.url) {
        coverById.set(pid, String(row.url));
      }
    }

    relatedItems = also.map((p: any) => ({
      id: p.id,
      title: p.title,
      price: Number(p.price || 0),
      quantity_unit: p.quantity_unit,
      category: p.category,
      product_images: coverById.has(p.id) ? [{ url: coverById.get(p.id)! }] : [],
    }));
  }

  // Datos del vendedor se renderizan con SellerInfoCard

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <Button asChild variant="ghost" className="w-fit px-0 text-primary hover:text-primary/80">
          <Link href="/" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver al marketplace
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Galería */}
        <div>
          <ProductGallery images={images} title={product.title} />
        </div>

        {/* Datos */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold sm:text-3xl text-foreground">{product.title}</h1>
            {isFeatured && (
              <Badge className="bg-primary text-primary-foreground">
                <Star className="mr-1 h-3 w-3" /> Destacado
              </Badge>
            )}
            <div className="ml-auto">
              <ProductShareButton
                productId={product.id}
                productTitle={product.title}
                sellerId={product.user_id as string}
                size="sm"
              />
            </div>
          </div>

          <div className={`text-2xl font-bold ${price === 'Consultar' ? 'text-primary' : 'text-foreground'}`}>{price}</div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Package className="h-4 w-4" /> {qty}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {product.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-4 w-4" /> Publicado el {createdAt}
            </span>
            <span className="inline-flex items-center gap-1">
              <Tag className="h-4 w-4" /> {product.category}
            </span>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Descripción</CardTitle>
              <CardDescription>
                Detalles del producto proporcionados por el vendedor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">{product.description}</p>
            </CardContent>
          </Card>

          {/* Perfil del vendedor */}
          {seller && <SellerInfoCard productTitle={product.title} seller={{
            id: product.user_id as string,
            first_name: seller.first_name ?? null,
            last_name: seller.last_name ?? null,
            full_name: seller.full_name ?? null,
            company: seller.company ?? null,
            city: seller.city ?? null,
            province: seller.province ?? null,
            location: (seller.city && seller.province) ? `${seller.city}, ${seller.province}` : (seller.city || seller.province || null),
            avatar_url: seller.avatar_url ?? null,
            phone: seller.phone ?? null,
            created_at: seller.updated_at ?? null,
            joined_at: seller.updated_at ?? null,
            plan_code: seller.plan_code ?? null,
            plan_label: seller.plan_code || "Básico",
            products_count: 0,
            likes_count: 0,
          }} />}

          {/* CTA opcionales, como contactar al vendedor, pueden añadirse aquí en el futuro */}
        </div>
      </div>

      {/* Más del vendedor (carrusel) */}
      {relatedItems.length > 0 && (
        <section className="mt-10">
          <RelatedProductsCarousel items={relatedItems} />
        </section>
      )}

      {/* Productos similares */}
      <SimilarProducts category={product.category as string} excludeProductId={product.id as string} excludeSellerId={product.user_id as string} />

    </div>
  );
}

