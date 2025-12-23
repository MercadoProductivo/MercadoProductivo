import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface LoadingSpinnerProps extends React.SVGProps<SVGSVGElement> {
    size?: number;
    className?: string;
}

export const LoadingSpinner = ({
    size = 24,
    className,
    ...props
}: LoadingSpinnerProps) => {
    return (
        <Loader2
            size={size}
            className={cn("animate-spin text-primary", className)}
            {...props}
        />
    );
};
