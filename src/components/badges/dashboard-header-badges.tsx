"use client";

import dynamic from "next/dynamic";

// Dynamic import con ssr:false solo permitido en Client Components
const VerifiedBadge = dynamic(() => import("./verified-badge"), {
    ssr: false,
    loading: () => <div className="h-8 w-8 rounded-full bg-slate-600/50 animate-pulse" />
});

// Dynamic import de PlanBadge (top-level)
const PlanBadge = dynamic(() => import("./plan-badge"), { ssr: true });

interface DashboardHeaderBadgesProps {
    emailVerified: boolean;
    planLabel: string;
    planCode: string;
}

/**
 * Wrapper cliente para los badges del header del dashboard.
 * Necesario porque dynamic import con ssr:false no funciona en Server Components.
 */
export default function DashboardHeaderBadges({
    emailVerified,
    planLabel,
    planCode
}: DashboardHeaderBadgesProps) {
    return (
        <div className="flex items-center gap-3">
            <VerifiedBadge isVerified={emailVerified} />
            <PlanBadge planLabel={planLabel} planCode={planCode} />
        </div>
    );
}
