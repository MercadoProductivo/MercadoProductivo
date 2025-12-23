'use client';

import type { Variants } from 'motion/react';
import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { motion, useAnimation } from 'motion/react';

import { cn } from '@/lib/utils';

export interface PackageIconHandle {
    startAnimation: () => void;
    stopAnimation: () => void;
}

interface PackageIconProps extends HTMLAttributes<HTMLDivElement> {
    size?: number;
}

const BOX_VARIANTS: Variants = {
    normal: {
        y: 0,
    },
    animate: {
        y: [-2, 0],
        transition: {
            type: 'spring',
            stiffness: 300,
            damping: 15,
        },
    },
};

const LINE_VARIANTS: Variants = {
    normal: {
        pathLength: 1,
        opacity: 1,
    },
    animate: {
        pathLength: [0.5, 1],
        opacity: [0.5, 1],
        transition: {
            duration: 0.4,
        },
    },
};

const PackageIcon = forwardRef<PackageIconHandle, PackageIconProps>(
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
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <motion.g variants={BOX_VARIANTS} animate={controls}>
                        <path d="m7.5 4.27 9 5.15" />
                        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                        <motion.path
                            d="m3.3 7 8.7 5 8.7-5"
                            variants={LINE_VARIANTS}
                            animate={controls}
                        />
                        <motion.path
                            d="M12 22V12"
                            variants={LINE_VARIANTS}
                            animate={controls}
                        />
                    </motion.g>
                </svg>
            </div>
        );
    }
);

PackageIcon.displayName = 'PackageIcon';

export { PackageIcon };
