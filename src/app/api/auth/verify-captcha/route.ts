import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { token } = await req.json();
        const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
        const secretKey = process.env.TURNSTILE_SECRET_KEY;

        if (!token) {
            return NextResponse.json({ error: "Token de CAPTCHA faltante" }, { status: 400 });
        }

        if (!secretKey) {
            logger.error("Falta TURNSTILE_SECRET_KEY en configuración");
            // En desarrollo o si falta config, podríamos pasar o fallar.
            // Por seguridad fallamos, pero loggeamos crítico.
            return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 });
        }

        const formData = new URLSearchParams();
        formData.append("secret", secretKey);
        formData.append("response", token);
        // formData.append("remoteip", req.headers.get("x-forwarded-for") || ...);

        const check = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
            method: "POST",
            body: formData,
        });

        const result = await check.json();

        if (result.success) {
            return NextResponse.json({ success: true });
        } else {
            logger.warn("Fallo validación Turnstile", { result });
            return NextResponse.json(
                { error: "Verificación de seguridad fallida. Intenta nuevamente." },
                { status: 400 }
            );
        }
    } catch (err: any) {
        logger.error("Error en verify-captcha", { error: err.message });
        return NextResponse.json(
            { error: "Error interno verificando seguridad" },
            { status: 500 }
        );
    }
}
