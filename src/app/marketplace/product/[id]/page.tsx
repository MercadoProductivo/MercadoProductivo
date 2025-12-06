import { redirect } from "next/navigation";

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  // Redirección permanente a la nueva ruta canónica de detalle de producto
  redirect(`/products/${id}`);
}
