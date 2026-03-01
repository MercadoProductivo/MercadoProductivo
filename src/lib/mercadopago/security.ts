import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Valida la firma HMAC del webhook de MercadoPago.
 * MP puede enviar el header x-signature en dos formatos:
 * - Nuevo (v1): "ts=<timestamp>,v1=<hmac_hex>"
 *   La firma cubre: "id:<dataId>;request-id:<requestId>;ts:<timestamp>;"
 * - Legacy: raw HMAC SHA256 del body (o sha256=<hash> al estilo GitHub)
 */
export async function validateMPSignature(
    req: Request,
    rawBody: string,
    dataId?: string,
): Promise<boolean> {
    const secret = process.env.MP_WEBHOOK_SECRET;
    const allowTests = process.env.MP_WEBHOOK_ALLOW_TESTS === "true";

    if (!secret) return true; // config legacy o dev sin secreto

    const sigHeader =
        (req.headers.get("x-signature") ||
            req.headers.get("x-hub-signature-256") ||
            req.headers.get("x-hub-signature")) ?? "";

    // --- Formato nuevo MP: ts=<ts>,v1=<hash> --------------------------------
    const tsMatch = /ts=(\d+)/.exec(sigHeader);
    const v1Match = /v1=([a-f0-9]+)/.exec(sigHeader);

    if (tsMatch && v1Match) {
        const requestId = req.headers.get("x-request-id") ?? "";
        const ts = tsMatch[1] ?? "";
        const provided = v1Match[1] ?? "";
        if (provided) {
            // El manifest que MP firma: "id:<dataId>;request-id:<requestId>;ts:<ts>;"
            const manifest = `id:${dataId ?? ""};request-id:${requestId};ts:${ts};`;
            const expected = createHmac("sha256", secret).update(manifest).digest("hex");
            const ok =
                provided.length === expected.length &&
                timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
            if (ok) return true;
        }
        // Si falla, seguir al bloque de log/bypass de abajo
    }

    // --- Formato legacy: raw HMAC del body (o sha256=<hash>) -----------------
    let providedLegacy = sigHeader.trim();
    const m = /sha256=([a-f0-9]+)/i.exec(providedLegacy);
    if (m && m[1]) providedLegacy = m[1];

    const expectedLegacy = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (
        providedLegacy.length === expectedLegacy.length &&
        timingSafeEqual(Buffer.from(providedLegacy), Buffer.from(expectedLegacy))
    ) {
        return true;
    }

    // --- Firma inválida por ambos métodos ------------------------------------
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
        return process.env.NODE_ENV !== "production";
    }
}
