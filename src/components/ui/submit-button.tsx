"use client";

import React, { useRef, useEffect } from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { LoaderPinwheelIcon, LoaderPinwheelIconHandle } from '@/components/animated-icons';
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
    const loaderRef = useRef<LoaderPinwheelIconHandle>(null);

    // Start/stop animation based on loading state
    useEffect(() => {
        if (isLoading) {
            loaderRef.current?.startAnimation();
        } else {
            loaderRef.current?.stopAnimation();
        }
    }, [isLoading]);

    return (
        <Button
            type="submit"
            disabled={disabled || isLoading}
            className={cn("w-full transition-all", className)}
            {...props}
        >
            {isLoading ? (
                <>
                    <LoaderPinwheelIcon ref={loaderRef} className="mr-2" size={16} />
                    {loadingText}
                </>
            ) : (
                text || children
            )}
        </Button>
    );
}

