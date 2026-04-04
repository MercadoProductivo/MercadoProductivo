import { NextResponse } from "next/server";
import { validateMPSignature } from "@/lib/mercadopago/security";
import { BillingService } from "@/services/billing-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getIdFromUrl(url: string) {
  try {
    const u = new URL(url);
    const id = u.searchParams.get("id") || u.searchParams.get("preapproval_id");
    return id || undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request) {
  let id: string | undefined;
  try {
    // 1. Leer body crudo para validación de firma
    const raw = await req.text().catch(() => "");

    // 2. Parsear body para obtener el id antes de validar firma (necesario para formato v1= de MP)
    const body = raw ? (JSON.parse(raw) as any) : undefined;
    id = (body?.data?.id as string | undefined) || (body?.id as string | undefined) || getIdFromUrl(req.url);

    // 3. Validar firma HMAC (pasamos dataId para soporte del formato v1= de MP)
    const isValid = await validateMPSignature(req, raw, id);
    if (!isValid) {
      return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
    }

    // 4. Determinar tipo de evento
    const typeRaw = (body?.type as string | undefined) || (body?.topic as string | undefined) || "";
    const type = typeRaw.toLowerCase();

    const isPreapproval = /preapproval/.test(type);
    const isAuthorizedPayment = /authorized_?payment/.test(type) || /authorized_payments?/.test(type);

    // 5. Delegar a BillingService
    if (isPreapproval && id) {
      await BillingService.processPreapproval(id);
    } else if (isAuthorizedPayment && id) {
      await BillingService.processAuthorizedPayment(id);
    } else if (!type && id) {
      // Fallback: si no viene type, asumimos preapproval (comportamiento legacy)
      await BillingService.processPreapproval(id);
    }

    // I1: Solo retornar 200 si el procesamiento fue exitoso
    return NextResponse.json({ ok: true, id: id || null });
  } catch (e) {
    console.error("[Webhook] Error procesando request:", e);
    // I1: Retornar 500 para que MP reintente automáticamente (no 200)
    return NextResponse.json({ ok: false, error: "processing_error" }, { status: 500 });
  }
}

// GET removido: era explotable sin autenticación de firma
// MP solo llama al webhook vía POST. Si necesitás reprocessar manualmente,
// usá un endpoint autenticado separado.
