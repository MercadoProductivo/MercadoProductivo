"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PricingSwitchProps {
    interval: "monthly" | "yearly";
}

export function PricingSwitch({ interval }: PricingSwitchProps) {
    const isYearly = interval === "yearly";

    return (
        <div className="flex justify-center mt-8">
            <div className="relative bg-slate-800/50 backdrop-blur-sm p-1.5 rounded-full inline-flex border border-slate-700 items-center ring-1 ring-white/5">
                <Link
                    href="/plans?interval=monthly"
                    scroll={false}
                    className={cn(
                        "relative z-10 px-8 py-2.5 rounded-full text-sm font-medium transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                        !isYearly ? "text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                >
                    {!isYearly && (
                        <motion.div
                            layoutId="bubble"
                            className="absolute inset-0 bg-orange-500 rounded-full shadow-lg shadow-orange-500/20"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className="relative z-10">Mensual</span>
                </Link>
                <Link
                    href="/plans?interval=yearly"
                    scroll={false}
                    className={cn(
                        "relative z-10 px-6 py-2.5 rounded-full text-sm font-medium transition-colors duration-200 flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
                        isYearly ? "text-white" : "text-slate-400 hover:text-slate-200"
                    )}
                >
                    {isYearly && (
                        <motion.div
                            layoutId="bubble"
                            className="absolute inset-0 bg-orange-500 rounded-full shadow-lg shadow-orange-500/20"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                        Anual
                        <span
                            className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
                                isYearly
                                    ? "bg-white/20 text-white"
                                    : "bg-green-500/10 text-green-400 border border-green-500/20"
                            )}
                        >
                            -17%
                        </span>
                    </span>
                </Link>
            </div>
        </div>
    );
}
