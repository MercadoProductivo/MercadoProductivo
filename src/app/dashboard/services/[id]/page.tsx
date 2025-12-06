import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil, Star, MapPin } from "lucide-react";
import { ProductGallery } from "@/components/products/product-gallery";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ServiceDetailDashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Intento 1: buscar por id
  let service: any = null;
  let svcError: any = null;
  {
    const { data, error } = await supabase
      .from("services")
      .select("id,user_id,title,description,category,price,created_at,location,featured_until")
      .eq("id", id)
      .single();
    service = data;
    svcError = error;
  }

  // Intento 2: con ownership reforzado
  if (!service) {
    const { data, error } = await supabase
      .from("services")
      .select("id,user_id,title,description,category,price,created_at,location,featured_until")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    service = data;
    if (!service) svcError = error;
  }

  if (!service) {
    console.error("Error fetching dashboard service detail:", svcError);
    notFound();
  }
  if (service.user_id !== user.id) notFound();

  // Cargar imágenes del servicio
  const { data: imagesData } = await supabase
    .from("service_images")
    .select("url")
    .eq("service_id", service.id)
    .order("id", { ascending: true });
  const imageUrls: string[] = (imagesData || []).map((i: any) => i.url);

  const isFeatured = Boolean(service.featured_until && new Date(service.featured_until) > new Date());
  const priceFmt = service.price == null
    ? "A convenir"
    : new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(service.price));

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4 sm:p-6 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <Button variant="outline" asChild size="sm">
          <Link href="/dashboard/services">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Link>
        </Button>
        <Button asChild size="sm" className="bg-orange-500 text-white hover:bg-orange-600">
          <Link href={`/dashboard/services/${service.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" /> Editar
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <ProductGallery images={imageUrls} title={service.title} />
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold sm:text-2xl">{service.title}</h1>
            {isFeatured && (
              <Badge className="bg-orange-500 text-white">
                <Star className="mr-1 h-3 w-3" /> Destacado
              </Badge>
            )}
          </div>
          <div className="text-base sm:text-lg">
            <span className="font-medium">{priceFmt}</span>
          </div>
          <div className="text-sm text-muted-foreground inline-flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {service.location || "Ubicación no especificada"}
          </div>
          <div>
            <div className="text-xs text-muted-foreground sm:text-sm">Categoría</div>
            <div className="text-sm">{service.category}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground sm:text-sm">Descripción</div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{service.description}</p>
          </div>
          <div className="text-xs text-muted-foreground">
            Publicado: {new Date(service.created_at).toLocaleDateString("es-AR")}
          </div>
        </div>
      </div>
    </div>
  );
}
