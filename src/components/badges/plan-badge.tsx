import { Badge } from "@/components/ui/badge";
import { Award, Gem, Crown } from "lucide-react";
import { normalizePlanCode, getPlanLabel } from "@/lib/plans";

export default function PlanBadge({
  planLabel,
  planCode,
  className,
}: {
  planLabel?: string | null;
  planCode?: string | null;
  className?: string;
}) {
  // Usar label custom o normalizar desde planCode
  const label = planLabel || getPlanLabel(planCode);
  const normalized = normalizePlanCode(planCode);
  const normLower = label.toLowerCase();

  // Clases por defecto (Básico)
  let bg = "bg-white border border-orange-300 hover:bg-orange-50 dark:border-orange-400/60";
  let text = "text-orange-600 dark:text-orange-300";
  let Icon: any = Award;

  if (normLower.includes("plus")) {
    // Gradiente en naranjas (Plus)
    bg = "bg-gradient-to-r from-orange-400 via-amber-500 to-orange-600";
    text = "text-white";
    Icon = Crown;
  } else if (normLower.includes("deluxe") || normLower.includes("diamond")) {
    // Gradiente estilo diamante con animación
    bg = "bg-gradient-to-r from-sky-400 via-indigo-500 to-fuchsia-500 animate-gradient-x";
    text = "text-white";
    Icon = Gem;
  }

  return (
    <Badge className={`${bg} ${text} ${className || ""}`.trim()}>
      <Icon className="h-3.5 w-3.5 mr-1" />
      {`Usuario ${label}`}
    </Badge>
  );
}
