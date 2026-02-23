'use client';

import type { HTMLAttributes } from 'react';
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { motion, useAnimate } from 'motion/react';

import { cn } from '@/lib/utils';

export interface HeartIconHandle {
    startAnimation: () => void;
    stopAnimation: () => void;
}

interface HeartIconProps extends HTMLAttributes<HTMLDivElement> {
    size?: number;
}

const HeartIcon = forwardRef<HeartIconHandle, HeartIconProps>(
    ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
        const [scope, animate] = useAnimate();
        const isControlledRef = useRef(false);

        useImperativeHandle(ref, () => {
            isControlledRef.current = true;

            return {
                startAnimation: () => {
                    if (scope.current) {
                        animate(
                            scope.current,
                            { scale: [1, 1.08, 1] },
                            { duration: 0.45, repeat: 2 }
                        );
                    }
                },
                stopAnimation: () => {
                    if (scope.current) {
                        animate(scope.current, { scale: 1 }, { duration: 0.2 });
                    }
                },
            };
        });

        const handleMouseEnter = useCallback(
            (e: React.MouseEvent<HTMLDivElement>) => {
                if (!isControlledRef.current && scope.current) {
                    animate(
                        scope.current,
                        { scale: [1, 1.08, 1] },
                        { duration: 0.45, repeat: 2 }
                    );
                }
                onMouseEnter?.(e);
            },
            [animate, onMouseEnter, scope]
        );

        const handleMouseLeave = useCallback(
            (e: React.MouseEvent<HTMLDivElement>) => {
                if (!isControlledRef.current && scope.current) {
                    animate(scope.current, { scale: 1 }, { duration: 0.2 });
                }
                onMouseLeave?.(e);
            },
            [animate, onMouseLeave, scope]
        );

        return (
            <div
                className={cn(className)}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                {...props}
            >
                <motion.svg
                    ref={scope}
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
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </motion.svg>
            </div>
        );
    }
);

HeartIcon.displayName = 'HeartIcon';

export { HeartIcon };
