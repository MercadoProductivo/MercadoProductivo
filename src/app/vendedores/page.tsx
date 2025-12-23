import { headers } from "next/headers";
import type React from "react";
import ProfileCard from "@/components/profile/profile-card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";

const PAGE_SIZE = 20; // 4 x 5

export default async function VendedoresPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || "1", 10) || 1);
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
  const proto = hdrs.get("x-forwarded-proto") || "http";
  const baseUrl = host ? `${proto}://${host}` : "";
  const apiUrl = `${baseUrl}/api/public/sellers?page=${page}&page_size=${PAGE_SIZE}`;
  const res = await fetch(apiUrl, { cache: "no-store" });
  if (!res.ok) {
    return (
      <div className="bg-background py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Vendedores</h1>
            <div className="w-24 h-1 bg-primary mx-auto mb-4"></div>
          </div>
          <EmptyState
            type="sellers"
            variant="error"
            actionLabel="Volver al inicio"
            actionHref="/"
          />
        </div>
      </div>
    );
  }
  const payload = await res.json();
  const sellers = (payload?.items || []) as Array<{
    id: string;
    name: string;
    avatar_url: string | null;
    plan_code: string | null;
    plan_label: string;
    joined_at: string | null;
    products_count: number;
    likes_count: number;
  }>;
  const total = payload?.total || 0;
  const totalPages = payload?.total_pages || Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="bg-background py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Vendedores</h1>
          <div className="w-24 h-1 bg-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Conoce a los vendedores y empresas que ofrecen sus productos en el Marketplace.</p>
        </div>

        {/* Estado vacío o Grid con vendedores */}
        {sellers.length === 0 ? (
          <EmptyState
            type="sellers"
            variant="empty"
            actionLabel="Ser vendedor"
            actionHref="/ser-vendedor"
          />
        ) : (
          <>
            {/* Grid 4x5 en escritorio (20 por página) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sellers.map((seller) => (
                <ProfileCard
                  key={seller.id}
                  name={seller.name}
                  avatarUrl={seller.avatar_url}
                  planCode={seller.plan_code}
                  planLabel={seller.plan_label}
                  joinedAt={seller.joined_at}
                  productsCount={seller.products_count}
                  likesCount={seller.likes_count}
                  href={`/vendedores/${seller.id}`}
                  fallbackInitial="V"
                />
              ))}
            </div>

            {/* Paginación (shadcn) */}
            {totalPages >= 1 && (
              <Pagination className="mt-16 sm:mt-20 lg:mt-24">
                <PaginationContent className="bg-card border rounded-full p-1 shadow-sm">
                  <PaginationItem>
                    <PaginationLink
                      href={hasPrev ? `/vendedores?page=${page - 1}` : "#"}
                      className={!hasPrev ? "pointer-events-none opacity-50" : "gap-1 pl-2.5 pr-3 rounded-full"}
                      size="default"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </PaginationLink>
                  </PaginationItem>

                  {/* Números con elipsis */}
                  {(() => {
                    const items: React.ReactNode[] = [];
                    const pushPage = (p: number) =>
                      items.push(
                        <PaginationItem key={p}>
                          <PaginationLink
                            href={`/vendedores?page=${p}`}
                            isActive={p === page}
                            size="icon"
                            className={p === page ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary" : ""}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );

                    // Siempre mostrar página 1
                    pushPage(1);

                    // Elipsis después de 1
                    const start = Math.max(2, page - 1);
                    const end = Math.min(totalPages - 1, page + 1);
                    if (start > 2) {
                      items.push(
                        <PaginationItem key="start-ellipsis">
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    // Ventana alrededor de la actual
                    for (let p = start; p <= end; p++) {
                      pushPage(p);
                    }

                    // Elipsis antes del final
                    if (end < totalPages - 1) {
                      items.push(
                        <PaginationItem key="end-ellipsis">
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    // Última página si es mayor a 1
                    if (totalPages > 1) {
                      pushPage(totalPages);
                    }

                    return items;
                  })()}

                  <PaginationItem>
                    <PaginationLink
                      href={hasNext ? `/vendedores?page=${page + 1}` : "#"}
                      className={!hasNext ? "pointer-events-none opacity-50" : "gap-1 pr-2.5 pl-3 rounded-full"}
                      size="default"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </div>
  );
}
