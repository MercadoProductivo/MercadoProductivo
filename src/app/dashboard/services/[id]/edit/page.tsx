import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft, Package } from "lucide-react";
import ServiceEditForm from "@/components/services/service-edit-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  created_at: string;
  user_id: string;
}

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || typeof id !== "string") notFound();

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/auth/login");

  // Obtener servicio (refuerza ownership)
  let service: Service | null = null;
  let svcError: any = null;

  {
    const { data, error } = await supabase
      .from("services")
      .select("id,title,description,price,category,location,province,city,origin_province,origin_city,dest_province,dest_city,featured_until,created_at,user_id")
      .eq("id", id)
      .single();
    service = (data as any) as Service | null;
    svcError = error;
  }

  if (!service) {
    const { data, error } = await supabase
      .from("services")
      .select("id,title,description,price,category,location,province,city,origin_province,origin_city,dest_province,dest_city,featured_until,created_at,user_id")
      .eq("id", id)
      .eq("user_id", user!.id)
      .single();
    service = (data as any) as Service | null;
    if (!service) svcError = error;
  }

  if (!service) {
    console.error("Error fetching dashboard service for edit:", svcError);
    notFound();
  }

  if (service.user_id !== user!.id) notFound();

  return (
    <div className="mx-auto max-w-4xl p-4 space-y-4 sm:p-6 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold sm:text-2xl flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Editar servicio
          </h1>
          <p className="text-sm text-muted-foreground">Modifica la información de tu servicio “{service.title}”.</p>
        </div>
        <Link href="/dashboard/services" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ArrowLeft size={16} />
          Volver a mis servicios
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del servicio</CardTitle>
          <CardDescription>
            Servicio creado el {new Date(service.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceEditForm service={service} />
        </CardContent>
      </Card>
    </div>
  );
}
