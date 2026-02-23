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

    // 2. Validar firma HMAC
    const isValid = await validateMPSignature(req, raw);
    if (!isValid) {
      return NextResponse.json({ ok: false, error: "invalid_signature" }, { status: 401 });
    }

    // 3. Parsear body
    const body = raw ? (JSON.parse(raw) as any) : undefined;

    // 4. Determinar ID y Tipo de evento
    id = (body?.data?.id as string | undefined) || (body?.id as string | undefined) || getIdFromUrl(req.url);
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
  } catch (e) {
    console.error("[Webhook] Error procesando request:", e);
  }

  return NextResponse.json({ ok: true, id: id || null });
}

export async function GET(req: Request) {
  const id = getIdFromUrl(req.url);
  if (id) {
    await BillingService.processPreapproval(id);
  }
  // MP espera 200 para no reintentar
  return NextResponse.json({ ok: true, id: id || null });
}
