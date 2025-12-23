import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface FloatingLabelPasswordInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    toggleAriaLabel?: string;
}

const FloatingLabelPasswordInput = React.forwardRef<HTMLInputElement, FloatingLabelPasswordInputProps>(
    ({ className, label, id, toggleAriaLabel = "Mostrar u ocultar contraseña", ...props }, ref) => {
        const [show, setShow] = React.useState(false);
        const generatedId = React.useId();
        const inputId = id || generatedId;

        return (
            <div className="relative">
                <Input
                    id={inputId}
                    type={show ? "text" : "password"}
                    placeholder=" "
                    className={cn(
                        "peer pt-6 pb-2 h-12 pr-10", // Padding right para el botón de ojo
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                <Label
                    htmlFor={inputId}
                    className={cn(
                        "absolute left-3 top-3 z-10 origin-[0] -translate-y-3 scale-75 transform cursor-text text-muted-foreground duration-200",
                        "peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100 peer-placeholder-shown:top-3.5",
                        "peer-focus:-translate-y-3 peer-focus:scale-75 peer-focus:top-3 peer-focus:text-primary",
                        "pointer-events-none"
                    )}
                >
                    {label}
                </Label>
                <button
                    type="button"
                    aria-label={toggleAriaLabel}
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-2 top-3.5 rounded p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
            </div>
        );
    }
);
FloatingLabelPasswordInput.displayName = "FloatingLabelPasswordInput";

export { FloatingLabelPasswordInput };
