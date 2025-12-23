'use client';

import type { Variants } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';

import { cn } from '@/lib/utils';

export interface AlertCircleIconHandle {
    startAnimation: () => void;
    stopAnimation: () => void;
}

interface AlertCircleIconProps extends HTMLAttributes<HTMLDivElement> {
    size?: number;
}

const SVG_VARIANTS: Variants = {
    normal: { scale: 1 },
    animate: {
        scale: [1, 1.1, 1],
        transition: {
            duration: 0.4,
            ease: 'easeInOut',
        },
    },
};

const LINE_VARIANTS: Variants = {
    normal: {
        opacity: 1,
    },
    animate: {
        opacity: [1, 0.5, 1],
        transition: {
            duration: 0.3,
            repeat: 2,
        },
    },
};

const AlertCircleIcon = forwardRef<AlertCircleIconHandle, AlertCircleIconProps>(
    ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
        const controls = useAnimation();
        const isControlledRef = useRef(false);

        useImperativeHandle(ref, () => {
            isControlledRef.current = true;

            return {
                startAnimation: () => controls.start('animate'),
                stopAnimation: () => controls.start('normal'),
            };
        });

        const handleMouseEnter = useCallback(
            (e: React.MouseEvent<HTMLDivElement>) => {
                if (!isControlledRef.current) {
                    controls.start('animate');
                } else {
                    onMouseEnter?.(e);
                }
            },
            [controls, onMouseEnter]
        );

        const handleMouseLeave = useCallback(
            (e: React.MouseEvent<HTMLDivElement>) => {
                if (!isControlledRef.current) {
                    controls.start('normal');
                } else {
                    onMouseLeave?.(e);
                }
            },
            [controls, onMouseLeave]
        );

        return (
            <div
                className={cn(className)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                {...props}
            >
                <motion.svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    variants={SVG_VARIANTS}
                    animate={controls}
                >
                    <circle cx="12" cy="12" r="10" />
                    <motion.line
                        x1="12"
                        x2="12"
                        y1="8"
                        y2="12"
                        variants={LINE_VARIANTS}
                        animate={controls}
                    />
                    <motion.line
                        x1="12"
                        x2="12.01"
                        y1="16"
                        y2="16"
                        variants={LINE_VARIANTS}
                        animate={controls}
                    />
                </motion.svg>
            </div>
        );
    }
);

AlertCircleIcon.displayName = 'AlertCircleIcon';

export { AlertCircleIcon };
