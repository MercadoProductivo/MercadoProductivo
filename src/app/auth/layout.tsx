import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { AuthLeftHero } from "@/components/auth/auth-left-hero";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-dvh grid lg:grid-cols-2 bg-white">
      {/* Izquierda: hero con gradiente */}
      <aside className="hidden lg:block">
        <AuthLeftHero />
      </aside>
      {/* Derecha: contenedor del contenido */}
      <section className="flex flex-col items-center justify-center p-6 lg:p-10 relative">
        <div className="absolute top-6 left-6 lg:top-10 lg:left-10">
          <Link href="/" className="group flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <div className="mr-2 rounded-full border bg-background p-1.5 shadow-sm group-hover:border-primary/50 group-hover:shadow-md transition-all">
              <ArrowLeft size={16} />
            </div>
            Volver al inicio
          </Link>
        </div>

        <div className="w-full max-w-[400px] space-y-6">
          <div className="flex flex-col items-center space-y-2 text-center">
            <Link href="/" className="mb-6">
              <Image src="/mp-logo.svg" alt="Mercado Productivo" width={280} height={70} className="h-24 w-auto" priority />
            </Link>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
