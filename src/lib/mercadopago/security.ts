import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function validateMPSignature(req: Request, rawBody: string): Promise<boolean> {
    const secret = process.env.MP_WEBHOOK_SECRET;
    const allowTests = process.env.MP_WEBHOOK_ALLOW_TESTS === "true";

    if (!secret) return true; // Si no hay secreto, no podemos validar (config legacy o dev)

    const sigHeader =
        (req.headers.get("x-signature") ||
            req.headers.get("x-hub-signature-256") ||
            req.headers.get("x-hub-signature")) ?? "";

    let provided = sigHeader.trim();
    // MP a veces manda "ts=...,v1=..." o raw hash, normalizamos si es github style "sha256=..."
    const m = /sha256=([a-f0-9]+)/i.exec(provided);
    if (m && m[1]) provided = m[1];

    // Nota: MP usa formato t=...,v1=... comúnmente, pero este código legado asumía sha256 directo.
    // Mantenemos la lógica actual que parecía funcionar o ser la intención,
    // pero idealmente deberíamos parsear 'v1=' si MP lo envía así.
    // Por ahora, replicamos la lógica exacta del route.ts original.

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

    // Comparación segura
    const ok =
        provided.length === expected.length &&
        timingSafeEqual(Buffer.from(provided), Buffer.from(expected));

    if (!ok) {
        const admin = createAdminClient();
        try {
            if (allowTests) {
                await admin.from("billing_events").insert({
                    user_id: null,
                    kind: "webhook_signature_bypassed_for_test",
                    payload: { provided: sigHeader || null } as any,
                } as any);
                return true;
            } else {
                await admin.from("billing_events").insert({
                    user_id: null,
                    kind: "webhook_signature_failed",
                    payload: { provided: sigHeader || null } as any,
                } as any);
                return process.env.NODE_ENV !== "production";
            }
        } catch {
            // Fallback si falla el log
            return process.env.NODE_ENV !== "production";
        }
    }

    return true;
}
