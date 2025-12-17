import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { rateLimitMiddleware } from "@/lib/rate-limit-kv";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * POST /api/chat/presence/heartbeat
 * Updates user's online status. Should be called every 30 seconds.
 */
export async function POST(req: Request) {
    try {
        const supabase = await createRouteClient();
        const {
            data: { user },
            error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }

        // Rate limiting: max 3 requests per minute per user
        const rateLimitResult = await rateLimitMiddleware(req, {
            maxRequests: 3,
            windowSeconds: 60,
            identifier: `presence-heartbeat-${user.id}`,
            namespace: "api:presence:heartbeat",
        });
        if (rateLimitResult instanceof Response) return rateLimitResult;

        // Check for offline flag (sent via sendBeacon on unload)
        const url = new URL(req.url);
        const isOfflineBeacon = url.searchParams.get("offline") === "true";

        // Update presence using the RPC function
        const { error } = await supabase.rpc("update_user_presence", {
            p_user_id: user.id,
            p_is_online: !isOfflineBeacon,
        });

        if (error) {
            // If the function doesn't exist yet, try direct upsert
            const { error: upsertError } = await supabase
                .from("user_presence")
                .upsert(
                    {
                        user_id: user.id,
                        is_online: true,
                        last_seen_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id" }
                );

            if (upsertError) {
                console.error("Presence heartbeat error:", upsertError);
                return NextResponse.json(
                    { error: "HEARTBEAT_FAILED", message: upsertError.message },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json({ ok: true, timestamp: new Date().toISOString() });
    } catch (e: any) {
        console.error("Presence heartbeat exception:", e);
        return NextResponse.json(
            { error: "INTERNAL_ERROR", message: e?.message || String(e) },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/chat/presence/heartbeat
 * Marks user as offline (called on page unload)
 */
export async function DELETE(req: Request) {
    try {
        const supabase = await createRouteClient();
        const {
            data: { user },
            error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }

        // Update presence to offline
        const { error } = await supabase.rpc("update_user_presence", {
            p_user_id: user.id,
            p_is_online: false,
        });

        if (error) {
            // Fallback to direct update
            await supabase
                .from("user_presence")
                .update({
                    is_online: false,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);
        }

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json(
            { error: "INTERNAL_ERROR", message: e?.message || String(e) },
            { status: 500 }
        );
    }
}
