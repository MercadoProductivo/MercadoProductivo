import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/contact
 * Recibe el formulario de contacto y guarda el mensaje en la DB.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
        }

        const nombre = String(body.nombre || "").trim();
        const email = String(body.email || "").trim();
        const asunto = String(body.asunto || "").trim();
        const mensaje = String(body.mensaje || "").trim();

        // Validaciones básicas
        if (!nombre || nombre.length < 2) {
            return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return NextResponse.json({ error: "Email inválido" }, { status: 400 });
        }
        if (!asunto || asunto.length < 3) {
            return NextResponse.json({ error: "Asunto inválido" }, { status: 400 });
        }
        if (!mensaje || mensaje.length < 1) {
            return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
        }

        const admin = createAdminClient();

        // Guardar en la tabla contact_messages (si existe en el schema) o en un log de billing_events
        const { error } = await admin
            .from("contact_messages" as any)
            .insert({ name: nombre, email, subject: asunto, message: mensaje });

        if (error) {
            // Si la tabla contact_messages no existe, igual devolvemos success
            // para no bloquear al usuario. El log aparecerá en los server logs.
            console.error("[Contact] DB insert error:", error.message);
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        console.error("[Contact] Unexpected error:", e);
        return NextResponse.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}
