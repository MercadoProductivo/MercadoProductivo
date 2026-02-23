import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface LoadingSpinnerProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
    className?: string;
    label?: string;
}

export const LoadingSpinner = ({
    size = 24,
    className,
    label = "Cargando...",
    ...props
}: LoadingSpinnerProps) => {
    return (
        <div role="status" className="inline-block">
            <Loader2
                size={size}
                className={cn("animate-spin text-primary", className)}
                aria-hidden="true"
                {...props}
            />
            <span className="sr-only">{label}</span>
        </div>
    );
};
