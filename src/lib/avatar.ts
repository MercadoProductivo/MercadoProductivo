import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Normalize avatar URL to ensure it's a valid public URL.
 * Handles various formats: full URLs, storage paths, relative paths.
 */
export function normalizeAvatarUrl(
    raw: string | null | undefined,
    supabase?: SupabaseClient | null
): string | null {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!s) return null;

    // Already a full URL
    if (/^https?:\/\//i.test(s)) return s;

    // Already contains the public path
    if (
        s.includes("/storage/v1/object/public/avatars/") ||
        s.includes("/object/public/avatars/")
    ) {
        return s;
    }

    // Treat as path within the avatars bucket
    const path = s.replace(/^avatars\//, "");

    // If we have a supabase client, use it to get the public URL
    if (supabase) {
        try {
            const { data } = supabase.storage.from("avatars").getPublicUrl(path);
            return data?.publicUrl ?? null;
        } catch {
            return null;
        }
    }

    // Fallback: construct URL manually if we have the env var
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
        return `${supabaseUrl}/storage/v1/object/public/avatars/${path}`;
    }

    return null;
}

/**
 * Get initials from name or email for avatar fallback.
 */
export function getAvatarInitials(
    name?: string | null,
    email?: string | null
): string {
    if (name) {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return (parts[0]?.[0] || "U").toUpperCase();
    }
    if (email) {
        return email[0]?.toUpperCase() || "U";
    }
    return "U";
}
