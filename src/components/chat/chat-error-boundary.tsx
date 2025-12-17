"use client";

import React from "react";

interface ChatErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

interface ChatErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    onReset?: () => void;
}

/**
 * Error boundary specifically for chat components.
 * Provides a graceful fallback UI when chat errors occur.
 */
export class ChatErrorBoundary extends React.Component<
    ChatErrorBoundaryProps,
    ChatErrorBoundaryState
> {
    constructor(props: ChatErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ChatErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("[ChatErrorBoundary] Error caught:", error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="mb-4 rounded-full bg-red-100 p-3">
                        <svg
                            className="h-6 w-6 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-900">
                        Error en el chat
                    </h3>
                    <p className="mb-4 text-sm text-gray-600">
                        Hubo un problema al cargar el chat. Por favor, intenta nuevamente.
                    </p>
                    <button
                        onClick={this.handleReset}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Wrapper component for using ChatErrorBoundary with hooks.
 */
export function withChatErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: React.ReactNode
) {
    return function WrappedComponent(props: P) {
        return (
            <ChatErrorBoundary fallback={fallback}>
                <Component {...props} />
            </ChatErrorBoundary>
        );
    };
}
