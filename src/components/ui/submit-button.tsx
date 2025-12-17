
import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubmitButtonProps extends ButtonProps {
    isLoading?: boolean;
    loadingText?: string;
    text?: string;
}

export function SubmitButton({
    isLoading = false,
    loadingText = "Cargando...",
    text,
    children,
    className,
    disabled,
    ...props
}: SubmitButtonProps) {
    // If explicitly disabled by prop, respect it.
    // Otherwise, only disable while loading (to prevent double submit), 
    // but NEVER disable based on validation (handled by react-hook-form on click).
    const isEnabled = !disabled && !isLoading;

    return (
        <Button
            type="submit"
            disabled={disabled || isLoading}
            className={cn("w-full transition-all", className)}
            {...props}
        >
            {isLoading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {loadingText}
                </>
            ) : (
                text || children
            )}
        </Button>
    );
}
