import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { normalizeRoleFromMetadata } from "@/lib/auth/role";

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({
            request: req,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() verifica el JWT criptográficamente contra el servidor (seguro).
  // getSession() solo lee el cookie sin verificar — no usar para proteger rutas.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Bloquear APIs legacy del chat v1
  if (
    req.nextUrl.pathname.startsWith("/api/messages") ||
    req.nextUrl.pathname.startsWith("/api/replies")
  ) {
    return NextResponse.json(
      {
        error: "CHAT_DESHABILITADO",
        message:
          "El sistema de chat legacy está en reconstrucción. Todas las rutas /api/messages y /api/replies están temporalmente deshabilitadas.",
      },
      { status: 410 }
    );
  }

  // Chat V2: permitir solo si la feature está activada
  if (req.nextUrl.pathname.startsWith("/api/chat")) {
    const chatEnabled = process.env.FEATURE_CHAT_V2_ENABLED === "true";
    if (!chatEnabled) {
      return NextResponse.json(
        {
          error: "CHAT_DESHABILITADO",
          message: "El sistema de chat v2 está temporalmente deshabilitado.",
        },
        { status: 410 }
      );
    }
  }

  // Proteger rutas del dashboard y perfil
  if (
    !user &&
    (req.nextUrl.pathname.startsWith("/dashboard") ||
      req.nextUrl.pathname.startsWith("/profile"))
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Permitir /dashboard para cualquier usuario autenticado (sin restringir por rol)

  // Evitar acceso a login/register si ya hay sesión iniciada
  if (
    user &&
    (req.nextUrl.pathname === "/auth/login" || req.nextUrl.pathname === "/auth/register")
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/"; // Inicio
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/auth/callback",
    "/auth/login",
    "/auth/register",
    // Bloqueo de APIs legacy
    "/api/messages/:path*",
    "/api/replies/:path*",
    "/api/chat/:path*",
  ],
};
