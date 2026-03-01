import { createAdminClient } from "@/lib/supabase/admin";
import { getMPConfig, getMPHeaders } from "@/lib/mercadopago/config";
import { logger } from "@/lib/logger";

function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(t));
}

export class BillingService {
    private static async getPlanPrice(code?: string | null): Promise<number> {
        if (!code) return 0;
        const admin = createAdminClient();
        const { data } = await admin
            .from("plans")
            .select("code, price_monthly, price_monthly_cents")
            .eq("code", code)
            .maybeSingle();

        const toNum = (v: any): number | null => {
            if (typeof v === "number" && Number.isFinite(v)) return v;
            if (typeof v === "string" && v.trim().length > 0) {
                const n = Number(v);
                return Number.isFinite(n) ? n : null;
            }
            return null;
        };

        // Using any cast here since database types might interpret numeric columns as number|string depending on driver
        const pm = toNum((data as any)?.price_monthly);
        const pmc = toNum((data as any)?.price_monthly_cents);
        const monthly = pm != null ? pm : (pmc != null ? pmc / 100 : null);
        return monthly != null ? monthly : 0;
    }

    static async processPreapproval(preapprovalId: string) {
        const admin = createAdminClient();
        try {
            getMPConfig(); // Force config check
        } catch (error) {
            try {
                await admin.from("billing_events").insert({
                    user_id: null,
                    kind: "preapproval_webhook_missing_token",
                    payload: { preapproval_id: preapprovalId, error: String(error) }, // Payload is jsonb, fine to pass object
                } as any);
            } catch (insertErr) {
                logger.error("[Webhook] Failed to log missing_token event", { preapprovalId, error: insertErr });
            }
            return;
        }

        try {
            const res = await fetchWithTimeout(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
                method: "GET",
                headers: getMPHeaders(),
                cache: "no-store",
            }, 10000);

            if (!res.ok) {
                const text = await res.text().catch(() => "");
                try {
                    await admin.from("billing_events").insert({
                        user_id: null,
                        kind: "preapproval_webhook_fetch_failed",
                        payload: { preapproval_id: preapprovalId, details: text || null },
                    } as any);
                } catch (insertErr) {
                    logger.error("[Webhook] Failed to log fetch_failed event", { preapprovalId, error: insertErr });
                }
                return;
            }

            const pre = await res.json();
            const status = (pre?.status as string | undefined) || null;
            const externalRef = (pre?.external_reference as string | undefined) || null;
            const id = (pre?.id as string | undefined) || preapprovalId;
            const reason = (pre?.reason as string | undefined) || null;
            const auto = (pre?.auto_recurring as any) || {};
            const freq = (auto?.frequency as number | undefined) ?? null;
            const ftype = (auto?.frequency_type as string | undefined) ?? null;
            const amount = (auto?.transaction_amount as number | undefined) ?? null;
            const currency_id = (auto?.currency_id as string | undefined) ?? null;

            let userId: string | null = null;
            let planCode: string | null = null;
            let refInterval: string | null = null;

            if (typeof externalRef === "string" && externalRef.includes(":")) {
                const parts = externalRef.split(":");
                userId = parts[0] || null;
                planCode = parts[1] || null;
                refInterval = parts[2] || null;
            }

            // Cargar perfil actual
            let profile: any | null = null;
            if (userId) {
                const { data: p } = await admin
                    .from("profiles")
                    .select("id, plan_code, plan_activated_at, plan_renews_at, plan_pending_code, plan_pending_effective_at, mp_preapproval_id, mp_subscription_status")
                    .eq("id", userId)
                    .maybeSingle();
                profile = p;
            }

            // Sincronizar estado de suscripción
            if (userId && profile?.mp_preapproval_id && profile.mp_preapproval_id === id && status) {
                try {
                    await admin
                        .from("profiles")
                        .update({ mp_subscription_status: status as any }) // status usually string, but strictly typed column might be enum
                        .eq("id", userId);
                } catch (updateErr) {
                    logger.error("[Webhook] Failed to sync subscription status", { userId, id, status, error: updateErr });
                }
            }

            // Manejar cancelación
            if (userId && status === "cancelled") {
                try {
                    const alreadyPending = !!(profile?.plan_pending_code);
                    if (!alreadyPending) {
                        const { data: freePlan } = await admin
                            .from("plans")
                            .select("code, price_monthly, price_monthly_cents")
                            .eq("code", "free")
                            .limit(1)
                            .maybeSingle();
                        const freeCode = (freePlan as any)?.code || "free";

                        let effectiveAt = new Date();
                        let isImmediate = true;
                        if (profile?.plan_renews_at) {
                            const r = new Date(profile.plan_renews_at);
                            if (!Number.isNaN(r.getTime()) && r > new Date()) {
                                effectiveAt = r;
                                isImmediate = false;
                            }
                        } else if (profile?.plan_activated_at) {
                            const a = new Date(profile.plan_activated_at);
                            if (!Number.isNaN(a.getTime())) {
                                const d = new Date(a);
                                d.setMonth(d.getMonth() + 1);
                                if (d > new Date()) { effectiveAt = d; isImmediate = false; }
                            }
                        }

                        if (isImmediate) {
                            // Aplicar cambio ahora mismo — no hay período activo
                            await admin
                                .from("profiles")
                                .update({
                                    plan_code: freeCode,
                                    plan_pending_code: null,
                                    plan_pending_effective_at: null,
                                    plan_activated_at: new Date().toISOString(),
                                    mp_subscription_status: "cancelled" as any,
                                })
                                .eq("id", userId);
                        } else {
                            // Programar cambio para fin de ciclo
                            await admin
                                .from("profiles")
                                .update({
                                    plan_pending_code: freeCode,
                                    plan_pending_effective_at: effectiveAt.toISOString(),
                                    mp_subscription_status: "cancelled" as any,
                                })
                                .eq("id", userId);
                        }

                        try {
                            await admin.from("billing_events").insert({
                                user_id: userId,
                                kind: isImmediate ? "plan_downgraded_to_free_immediate" : "subscription_cancelled_by_mp",
                                payload: { preapproval_id: id, plan_pending_code: freeCode, effective_at: effectiveAt.toISOString(), immediate: isImmediate },
                            } as any);
                        } catch (insertErr) {
                            logger.error("[Webhook] Failed to log cancellation event", { userId, id, error: insertErr });
                        }
                    }
                } catch (cancelErr) {
                    logger.error("[Webhook] Failed to process MP cancellation", { userId, id, error: cancelErr });
                }
            }

            // Fallback update por preapproval_id si no hay userId
            if (!userId) {
                await admin
                    .from("profiles")
                    .update({ mp_subscription_status: status as any })
                    .eq("mp_preapproval_id", id);
            }

            // Upgrade inmediato
            if (status === "authorized" && userId && planCode) {
                const currentPrice = await this.getPlanPrice(profile?.plan_code || null);
                const targetPrice = await this.getPlanPrice(planCode);
                const isUpgrade = targetPrice > currentPrice;

                if (isUpgrade) {
                    const now = new Date();
                    const renews = new Date(now);
                    if (ftype === "months") {
                        renews.setMonth(renews.getMonth() + (typeof freq === "number" && freq > 0 ? freq : 1));
                    } else if (ftype === "days") {
                        renews.setDate(renews.getDate() + (typeof freq === "number" && freq > 0 ? freq : 30));
                    } else {
                        renews.setMonth(renews.getMonth() + 1);
                    }

                    const { data: updProfile, error: updErr } = await admin
                        .from("profiles")
                        .update({
                            plan_code: planCode,
                            plan_pending_code: null,
                            plan_pending_effective_at: null,
                            plan_activated_at: now.toISOString(),
                            plan_renews_at: renews.toISOString(),
                            mp_preapproval_id: id,
                            mp_subscription_status: status as any,
                        })
                        .eq("id", userId)
                        .select("id, plan_code, mp_preapproval_id")
                        .maybeSingle();

                    if (updErr || !updProfile) {
                        try {
                            await admin.from("billing_events").insert({
                                user_id: userId,
                                kind: "preapproval_profile_update_failed",
                                payload: {
                                    preapproval_id: id,
                                    target_plan_code: planCode,
                                    error: (updErr as any)?.message || null,
                                    updated: updProfile || null,
                                },
                            } as any);
                        } catch { }
                    } else {
                        try {
                            await admin.from("billing_events").insert({
                                user_id: userId,
                                kind: "preapproval_profile_update_ok",
                                payload: {
                                    preapproval_id: id,
                                    plan_code: updProfile.plan_code,
                                    mp_preapproval_id: updProfile.mp_preapproval_id,
                                },
                            } as any);
                        } catch { }
                    }

                    // Cancelar anterior
                    const oldPreId = profile?.mp_preapproval_id && profile.mp_preapproval_id !== id ? profile.mp_preapproval_id : null;
                    if (oldPreId) {
                        try {
                            await fetchWithTimeout(`https://api.mercadopago.com/preapproval/${oldPreId}`, {
                                method: "PUT",
                                headers: getMPHeaders(),
                                body: JSON.stringify({ status: "cancelled" }),
                            }, 10000);

                            await admin.from("billing_events").insert({
                                user_id: userId,
                                kind: "preapproval_cancelled_on_upgrade",
                                payload: {
                                    previous_preapproval_id: oldPreId,
                                    new_preapproval_id: id,
                                    frequency: freq,
                                    amount: amount,
                                    interval: refInterval,
                                    reason: reason,
                                },
                            } as any);
                        } catch { }
                    }

                    try {
                        await admin.from("billing_events").insert({
                            user_id: userId,
                            kind: "plan_upgraded_immediate",
                            payload: {
                                preapproval_id: id,
                                plan_code: planCode,
                                frequency: freq,
                                amount: amount,
                                interval: refInterval,
                                reason: reason,
                            },
                        } as any);
                    } catch { }
                } else {
                    // Downgrade logic
                    try {
                        await fetchWithTimeout(`https://api.mercadopago.com/preapproval/${id}`, {
                            method: "PUT",
                            headers: getMPHeaders(),
                            body: JSON.stringify({ status: "paused" }),
                        }, 10000);

                        await admin.from("billing_events").insert({
                            user_id: userId,
                            kind: "preapproval_paused_on_downgrade",
                            payload: {
                                preapproval_id: id,
                                target_plan_code: planCode,
                                frequency: freq,
                                amount: amount,
                                interval: refInterval,
                                reason: reason,
                            },
                        } as any);
                    } catch { }
                    try {
                        await admin.from("billing_events").insert({
                            user_id: userId,
                            kind: "plan_downgrade_scheduled_keep_current_until_renewal",
                            payload: {
                                preapproval_id: id,
                                target_plan_code: planCode,
                                frequency: freq,
                                amount: amount,
                                interval: refInterval,
                                reason: reason,
                            },
                        } as any);
                    } catch { }
                }
            }

            try {
                await admin.from("billing_events").insert({
                    user_id: userId,
                    kind: "preapproval_webhook",
                    payload: { preapproval_id: id, status, external_reference: externalRef, plan_code: planCode, interval: refInterval, amount, currency_id, frequency: freq, frequency_type: ftype, reason },
                } as any);
            } catch { }

        } catch (e: any) {
            try {
                await admin.from("billing_events").insert({
                    user_id: null,
                    kind: "preapproval_webhook_exception",
                    payload: { preapproval_id: preapprovalId, error: e?.message || String(e) },
                } as any);
            } catch { }
        }
    }

    static async processAuthorizedPayment(paymentId: string) {
        const admin = createAdminClient();
        try {
            getMPConfig();
        } catch (error) {
            try {
                await admin.from("billing_events").insert({
                    user_id: null,
                    kind: "authorized_payment_webhook_missing_token",
                    payload: { payment_id: paymentId, error: String(error) },
                } as any);
            } catch { }
            return;
        }

        try {
            const payRes = await fetchWithTimeout(`https://api.mercadopago.com/authorized_payments/${paymentId}`, {
                method: "GET",
                headers: getMPHeaders(),
                cache: "no-store",
            }, 10000);

            if (!payRes.ok) {
                const text = await payRes.text().catch(() => "");
                try {
                    await admin.from("billing_events").insert({
                        user_id: null,
                        kind: "authorized_payment_fetch_failed",
                        payload: { payment_id: paymentId, details: text || null },
                    } as any);
                } catch { }
                return;
            }

            const payment = await payRes.json();
            const status = (payment?.status as string | undefined) || null;
            const statusDetail = (payment?.status_detail as string | undefined) || null;
            const preapprovalId = (payment?.preapproval_id as string | undefined)
                || (payment?.preapproval?.id as string | undefined)
                || undefined;

            const isSuccess =
                (typeof status === "string" && status.toLowerCase() === "approved") ||
                (typeof statusDetail === "string" && statusDetail.toLowerCase() === "accredited");

            if (!isSuccess) {
                try {
                    await admin.from("billing_events").insert({
                        user_id: null,
                        kind: "subscription_payment_failed",
                        payload: {
                            payment_id: paymentId,
                            preapproval_id: preapprovalId || null,
                            status,
                            status_detail: statusDetail,
                            amount: (payment?.transaction_amount ?? payment?.amount ?? null) as number | null,
                            currency_id: (payment?.currency_id ?? null) as string | null,
                            raw: payment || null,
                        },
                    } as any);
                } catch { }
                return;
            }

            if (!preapprovalId) {
                try {
                    await admin.from("billing_events").insert({
                        user_id: null,
                        kind: "authorized_payment_missing_preapproval",
                        payload: { payment_id: paymentId, raw: payment || null },
                    } as any);
                } catch { }
                return;
            }

            const preRes = await fetchWithTimeout(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
                method: "GET",
                headers: getMPHeaders(),
                cache: "no-store",
            }, 10000);

            if (!preRes.ok) {
                const text = await preRes.text().catch(() => "");
                try {
                    await admin.from("billing_events").insert({
                        user_id: null,
                        kind: "authorized_payment_preapproval_fetch_failed",
                        payload: { payment_id: paymentId, preapproval_id: preapprovalId, details: text || null },
                    } as any);
                } catch { }
                return;
            }

            const pre = await preRes.json();
            const externalRef = (pre?.external_reference as string | undefined) || null;
            const auto = (pre?.auto_recurring as any) || {};
            const freq = (auto?.frequency as number | undefined) ?? 1;
            const ftype = (auto?.frequency_type as string | undefined) ?? "months";

            let userId: string | null = null;
            if (typeof externalRef === "string" && externalRef.includes(":")) {
                const parts = externalRef.split(":");
                userId = parts[0] || null;
            }

            const now = new Date();
            const renews = new Date(now);
            if (ftype === "months") {
                renews.setMonth(renews.getMonth() + (typeof freq === "number" && freq > 0 ? freq : 1));
            } else if (ftype === "days") {
                renews.setDate(renews.getDate() + (typeof freq === "number" && freq > 0 ? freq : 30));
            } else {
                renews.setMonth(renews.getMonth() + 1);
            }
            const nextRenewsAt = renews.toISOString();

            if (userId) {
                await admin
                    .from("profiles")
                    .update({ plan_renews_at: nextRenewsAt, mp_subscription_status: "authorized" as any })
                    .eq("id", userId);
            } else {
                await admin
                    .from("profiles")
                    .update({ plan_renews_at: nextRenewsAt, mp_subscription_status: "authorized" as any })
                    .eq("mp_preapproval_id", preapprovalId);
            }

            // Reacreditar créditos
            try {
                let targetUserId: string | null = userId;
                if (!targetUserId && preapprovalId) {
                    const { data: prof } = await admin
                        .from("profiles")
                        .select("id")
                        .eq("mp_preapproval_id", preapprovalId)
                        .maybeSingle();
                    targetUserId = prof?.id || null;
                }
                if (targetUserId) {
                    const { data: credited, error: refillError } = await (admin.rpc as any)("refill_monthly_credits", { p_user: targetUserId });
                    try {
                        await admin.from("billing_events").insert({
                            user_id: targetUserId,
                            kind: "credits_refilled_on_renewal",
                            payload: { payment_id: paymentId, preapproval_id: preapprovalId, credited: credited ?? null },
                        } as any);
                    } catch { }
                    if (refillError) {
                        try {
                            await admin.from("billing_events").insert({
                                user_id: targetUserId,
                                kind: "credits_refill_error",
                                payload: { payment_id: paymentId, preapproval_id: preapprovalId, error: (refillError as any)?.message || null },
                            } as any);
                        } catch { }
                    }
                }
            } catch { }

            try {
                await admin.from("billing_events").insert({
                    user_id: userId,
                    kind: "subscription_renewed",
                    payload: {
                        payment_id: paymentId,
                        preapproval_id: preapprovalId,
                        amount: (payment?.transaction_amount ?? payment?.amount ?? null) as number | null,
                        currency_id: (payment?.currency_id ?? null) as string | null,
                        frequency: freq,
                        frequency_type: ftype,
                        status,
                        status_detail: statusDetail,
                    },
                } as any);
            } catch { }

        } catch (e: any) {
            try {
                await admin.from("billing_events").insert({
                    user_id: null,
                    kind: "authorized_payment_exception",
                    payload: { payment_id: paymentId, error: e?.message || String(e) },
                } as any);
            } catch { }
        }
    }
}
