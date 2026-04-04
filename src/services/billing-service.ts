import { createAdminClient } from "@/lib/supabase/admin";
import { getMPConfig } from "@/lib/mercadopago/config";
import { logger } from "@/lib/logger";
import { MPApiClient } from "@/lib/services/billing";
import type { Json } from "@/types/database.types";

/** Regex para validar UUID v4 (I2 — previene inyección de IDs malformados) */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Convierte un objeto a tipo Json de Supabase de forma segura.
 */
function toJson(obj: Record<string, unknown>): Json {
    return obj as unknown as Json;
}

/**
 * Extrae y valida userId, planCode y interval de un external_reference MP.
 * Formato esperado: "<uuid>:<plan_code>:<interval>"
 */
function parseExternalRef(externalRef: string | null | undefined): {
    userId: string | null;
    planCode: string | null;
    refInterval: string | null;
} {
    if (typeof externalRef !== "string" || !externalRef.includes(":")) {
        return { userId: null, planCode: null, refInterval: null };
    }
    const parts = externalRef.split(":");
    const candidateId = parts[0] || "";
    const userId = UUID_RE.test(candidateId) ? candidateId : null;
    if (!userId && candidateId) {
        logger.warn("[BillingService] external_reference userId no es UUID válido", { externalRef, candidateId });
    }
    return {
        userId,
        planCode: parts[1] || null,
        refInterval: parts[2] || null,
    };
}

export class BillingService {
    private static async getPlanPrice(code?: string | null): Promise<number> {
        if (!code) return 0;
        const admin = createAdminClient();
        const { data } = await admin
            .from("plans")
            .select("code, price_monthly_cents")
            .eq("code", code)
            .maybeSingle();

        const cents = data?.price_monthly_cents;
        return typeof cents === "number" && Number.isFinite(cents) ? cents / 100 : 0;
    }

    static async processPreapproval(preapprovalId: string) {
        const admin = createAdminClient();
        try {
            getMPConfig();
        } catch (error) {
            try {
                await admin.from("billing_events").insert({
                    user_id: null,
                    kind: "preapproval_webhook_missing_token",
                    payload: toJson({ preapproval_id: preapprovalId, error: String(error) }),
                });
            } catch (insertErr) {
                logger.error("[Webhook] Failed to log missing_token event", { preapprovalId, error: insertErr });
            }
            return;
        }

        try {
            // ── Fetch preapproval via MPApiClient (retry + timeout centralizados) ──
            let pre: Record<string, unknown>;
            try {
                pre = await MPApiClient.getPreapproval(preapprovalId);
            } catch (fetchErr: unknown) {
                const details = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
                try {
                    await admin.from("billing_events").insert({
                        user_id: null,
                        kind: "preapproval_webhook_fetch_failed",
                        payload: toJson({ preapproval_id: preapprovalId, details }),
                    });
                } catch (insertErr) {
                    logger.error("[Webhook] Failed to log fetch_failed event", { preapprovalId, error: insertErr });
                }
                return;
            }

            const status = (pre.status as string | undefined) || null;
            const externalRef = (pre.external_reference as string | undefined) || null;
            const id = (pre.id as string | undefined) || preapprovalId;
            const reason = (pre.reason as string | undefined) || null;
            const auto = (pre.auto_recurring as Record<string, unknown>) || {};
            const freq = (auto.frequency as number | undefined) ?? null;
            const ftype = (auto.frequency_type as string | undefined) ?? null;
            const amount = (auto.transaction_amount as number | undefined) ?? null;
            const currency_id = (auto.currency_id as string | undefined) ?? null;

            const { userId, planCode, refInterval } = parseExternalRef(externalRef);

            // Cargar perfil actual
            let profile: {
                id: string;
                plan_code: string | null;
                plan_activated_at: string | null;
                plan_renews_at: string | null;
                plan_pending_code: string | null;
                plan_pending_effective_at: string | null;
                mp_preapproval_id: string | null;
                mp_subscription_status: string | null;
            } | null = null;
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
                        .update({ mp_subscription_status: status })
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
                            .select("code, price_monthly_cents")
                            .eq("code", "free")
                            .limit(1)
                            .maybeSingle();
                        const freeCode = freePlan?.code || "free";

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
                            await admin
                                .from("profiles")
                                .update({
                                    plan_code: freeCode,
                                    plan_pending_code: null,
                                    plan_pending_effective_at: null,
                                    plan_activated_at: new Date().toISOString(),
                                    mp_subscription_status: "cancelled",
                                })
                                .eq("id", userId);
                        } else {
                            await admin
                                .from("profiles")
                                .update({
                                    plan_pending_code: freeCode,
                                    plan_pending_effective_at: effectiveAt.toISOString(),
                                    mp_subscription_status: "cancelled",
                                })
                                .eq("id", userId);
                        }

                        try {
                            await admin.from("billing_events").insert({
                                user_id: userId,
                                kind: isImmediate ? "plan_downgraded_to_free_immediate" : "subscription_cancelled_by_mp",
                                payload: toJson({ preapproval_id: id, plan_pending_code: freeCode, effective_at: effectiveAt.toISOString(), immediate: isImmediate }),
                            });
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
                    .update({ mp_subscription_status: status })
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
                            mp_subscription_status: status,
                        })
                        .eq("id", userId)
                        .select("id, plan_code, mp_preapproval_id")
                        .maybeSingle();

                    if (updErr || !updProfile) {
                        try {
                            await admin.from("billing_events").insert({
                                user_id: userId,
                                kind: "preapproval_profile_update_failed",
                                payload: toJson({
                                    preapproval_id: id,
                                    target_plan_code: planCode,
                                    error: updErr?.message || null,
                                    updated: updProfile || null,
                                }),
                            });
                        } catch { }
                    } else {
                        try {
                            await admin.from("billing_events").insert({
                                user_id: userId,
                                kind: "preapproval_profile_update_ok",
                                payload: toJson({
                                    preapproval_id: id,
                                    plan_code: updProfile.plan_code,
                                    mp_preapproval_id: updProfile.mp_preapproval_id,
                                }),
                            });
                        } catch { }
                    }

                    // Cancelar preapproval anterior vía MPApiClient
                    const oldPreId = profile?.mp_preapproval_id && profile.mp_preapproval_id !== id ? profile.mp_preapproval_id : null;
                    if (oldPreId) {
                        try {
                            await MPApiClient.cancelPreapproval(oldPreId);
                            await admin.from("billing_events").insert({
                                user_id: userId,
                                kind: "preapproval_cancelled_on_upgrade",
                                payload: toJson({
                                    previous_preapproval_id: oldPreId,
                                    new_preapproval_id: id,
                                    frequency: freq,
                                    amount,
                                    interval: refInterval,
                                    reason,
                                }),
                            });
                        } catch { }
                    }

                    try {
                        await admin.from("billing_events").insert({
                            user_id: userId,
                            kind: "plan_upgraded_immediate",
                            payload: toJson({ preapproval_id: id, plan_code: planCode, frequency: freq, amount, interval: refInterval, reason }),
                        });
                    } catch { }
                } else {
                    // Downgrade logic — pausar nueva preapproval vía MPApiClient
                    try {
                        await MPApiClient.pausePreapproval(id);
                        await admin.from("billing_events").insert({
                            user_id: userId,
                            kind: "preapproval_paused_on_downgrade",
                            payload: toJson({ preapproval_id: id, target_plan_code: planCode, frequency: freq, amount, interval: refInterval, reason }),
                        });
                    } catch { }
                    try {
                        await admin.from("billing_events").insert({
                            user_id: userId,
                            kind: "plan_downgrade_scheduled_keep_current_until_renewal",
                            payload: toJson({ preapproval_id: id, target_plan_code: planCode, frequency: freq, amount, interval: refInterval, reason }),
                        });
                    } catch { }
                }
            }

            try {
                await admin.from("billing_events").insert({
                    user_id: userId,
                    kind: "preapproval_webhook",
                    payload: toJson({ preapproval_id: id, status, external_reference: externalRef, plan_code: planCode, interval: refInterval, amount, currency_id, frequency: freq, frequency_type: ftype, reason }),
                });
            } catch { }

        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e);
            try {
                await admin.from("billing_events").insert({
                    user_id: null,
                    kind: "preapproval_webhook_exception",
                    payload: toJson({ preapproval_id: preapprovalId, error: errMsg }),
                });
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
                    payload: toJson({ payment_id: paymentId, error: String(error) }),
                });
            } catch { }
            return;
        }

        try {
            // ── Fetch authorized_payment via MPApiClient ──────────────────────
            let payment: Record<string, unknown>;
            try {
                payment = await MPApiClient.getAuthorizedPayment(paymentId);
            } catch (fetchErr: unknown) {
                const details = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
                try {
                    await admin.from("billing_events").insert({
                        user_id: null,
                        kind: "authorized_payment_fetch_failed",
                        payload: toJson({ payment_id: paymentId, details }),
                    });
                } catch { }
                return;
            }

            const status = (payment.status as string | undefined) || null;
            const statusDetail = (payment.status_detail as string | undefined) || null;
            const preapprovalId = (payment.preapproval_id as string | undefined)
                || ((payment.preapproval as Record<string, unknown> | undefined)?.id as string | undefined)
                || undefined;

            const isSuccess =
                (typeof status === "string" && status.toLowerCase() === "approved") ||
                (typeof statusDetail === "string" && statusDetail.toLowerCase() === "accredited");

            if (!isSuccess) {
                try {
                    await admin.from("billing_events").insert({
                        user_id: null,
                        kind: "subscription_payment_failed",
                        payload: toJson({
                            payment_id: paymentId,
                            preapproval_id: preapprovalId || null,
                            status,
                            status_detail: statusDetail,
                            amount: (payment.transaction_amount ?? payment.amount ?? null) as number | null,
                            currency_id: (payment.currency_id ?? null) as string | null,
                        }),
                    });
                } catch { }
                return;
            }

            if (!preapprovalId) {
                try {
                    await admin.from("billing_events").insert({
                        user_id: null,
                        kind: "authorized_payment_missing_preapproval",
                        payload: toJson({ payment_id: paymentId }),
                    });
                } catch { }
                return;
            }

            // ── Fetch preapproval para calcular renovación ────────────────────
            let pre: Record<string, unknown>;
            try {
                pre = await MPApiClient.getPreapproval(preapprovalId);
            } catch (fetchErr: unknown) {
                const details = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
                try {
                    await admin.from("billing_events").insert({
                        user_id: null,
                        kind: "authorized_payment_preapproval_fetch_failed",
                        payload: toJson({ payment_id: paymentId, preapproval_id: preapprovalId, details }),
                    });
                } catch { }
                return;
            }

            const externalRef = (pre.external_reference as string | undefined) || null;
            const auto = (pre.auto_recurring as Record<string, unknown>) || {};
            const freq = (auto.frequency as number | undefined) ?? 1;
            const ftype = (auto.frequency_type as string | undefined) ?? "months";

            // Validar UUID del userId (I2)
            const { userId } = parseExternalRef(externalRef);

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
                    .update({ plan_renews_at: nextRenewsAt, mp_subscription_status: "authorized" })
                    .eq("id", userId);
            } else {
                await admin
                    .from("profiles")
                    .update({ plan_renews_at: nextRenewsAt, mp_subscription_status: "authorized" })
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
                    // @ts-expect-error -- 'refill_monthly_credits' es RPC Postgres no tipado aún
                    const { data: credited, error: refillError } = await admin.rpc("refill_monthly_credits", { p_user: targetUserId });
                    try {
                        await admin.from("billing_events").insert({
                            user_id: targetUserId,
                            kind: "credits_refilled_on_renewal",
                            payload: toJson({ payment_id: paymentId, preapproval_id: preapprovalId, credited: credited ?? null }),
                        });
                    } catch { }
                    if (refillError) {
                        try {
                            await admin.from("billing_events").insert({
                                user_id: targetUserId,
                                kind: "credits_refill_error",
                                payload: toJson({ payment_id: paymentId, preapproval_id: preapprovalId, error: refillError.message || null }),
                            });
                        } catch { }
                    }
                }
            } catch { }

            try {
                await admin.from("billing_events").insert({
                    user_id: userId,
                    kind: "subscription_renewed",
                    payload: toJson({
                        payment_id: paymentId,
                        preapproval_id: preapprovalId,
                        amount: (payment.transaction_amount ?? payment.amount ?? null) as number | null,
                        currency_id: (payment.currency_id ?? null) as string | null,
                        frequency: freq,
                        frequency_type: ftype,
                        status,
                        status_detail: statusDetail,
                    }),
                });
            } catch { }

        } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e);
            try {
                await admin.from("billing_events").insert({
                    user_id: null,
                    kind: "authorized_payment_exception",
                    payload: toJson({ payment_id: paymentId, error: errMsg }),
                });
            } catch { }
        }
    }
}
