import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FloatingLabelInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const FloatingLabelInput = React.forwardRef<HTMLInputElement, FloatingLabelInputProps>(
    ({ className, label, id, ...props }, ref) => {
        // Generar un ID si no se proporciona uno, para vincular el label
        const generatedId = React.useId();
        const inputId = id || generatedId;

        return (
            <div className="relative">
                <Input
                    id={inputId}
                    placeholder=" " // Placeholder vacío necesario para el selector :placeholder-shown
                    className={cn(
                        "peer pt-6 pb-2 h-12", // Ajuste de padding para dejar espacio al label
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                <Label
                    htmlFor={inputId}
                    className={cn(
                        "absolute left-3 top-3 z-10 origin-[0] -translate-y-3 scale-75 transform cursor-text text-muted-foreground duration-200",
                        // Estado cuando el input tiene placeholder mostrado (está vacío y sin foco) -> Se ve como un placeholder normal
                        "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:top-3.5",
                        // Estado cuando tiene foco o valor -> Flota arriba
                        "peer-focus:-translate-y-3 peer-focus:scale-75 peer-focus:top-3 peer-focus:text-primary",
                        "pointer-events-none" // Permitir clicks en el input a través del label
                    )}
                >
                    {label}
                </Label>
            </div>
        );
    }
);
FloatingLabelInput.displayName = "FloatingLabelInput";

export { FloatingLabelInput };
