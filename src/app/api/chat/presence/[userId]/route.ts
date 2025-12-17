import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const uuidSchema = z.string().uuid();

/**
 * GET /api/chat/presence/[userId]
 * Returns the online status and last seen time for a user
 */
export async function GET(
    _req: Request,
    ctx: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await ctx.params;

        // Validate UUID
        const validation = uuidSchema.safeParse(userId);
        if (!validation.success) {
            return NextResponse.json(
                { error: "INVALID_USER_ID", message: "ID de usuario inválido" },
                { status: 400 }
            );
        }

        const supabase = await createRouteClient();
        const {
            data: { user },
            error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) {
            return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
        }

        // Get presence for the requested user
        const { data, error } = await supabase
            .from("user_presence")
            .select("is_online, last_seen_at, updated_at")
            .eq("user_id", userId)
            .maybeSingle();

        if (error) {
            console.error("Presence lookup error:", error);
            return NextResponse.json(
                { error: "LOOKUP_FAILED", message: error.message },
                { status: 500 }
            );
        }

        // If no record, user has never been online
        if (!data) {
            return NextResponse.json({
                user_id: userId,
                is_online: false,
                last_seen_at: null,
            });
        }

        // Check if presence is stale (more than 2 minutes old = considered offline)
        const updatedAt = new Date(data.updated_at).getTime();
        const staleThreshold = 2 * 60 * 1000; // 2 minutes
        const isStale = Date.now() - updatedAt > staleThreshold;
        const effectiveOnline = data.is_online && !isStale;

        return NextResponse.json({
            user_id: userId,
            is_online: effectiveOnline,
            last_seen_at: data.last_seen_at,
        });
    } catch (e: any) {
        console.error("Presence lookup exception:", e);
        return NextResponse.json(
            { error: "INTERNAL_ERROR", message: e?.message || String(e) },
            { status: 500 }
        );
    }
}
