'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // Con SSR, normalmente queremos establecer un staleTime predeterminado
                // por encima de 0 para evitar refetch inmediato en el cliente
                staleTime: 60 * 1000, // 1 minuto
                gcTime: 5 * 60 * 1000, // 5 minutos (antes cacheTime)
            },
        },
    });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
    if (typeof window === 'undefined') {
        // Server: siempre crea un nuevo query client
        return makeQueryClient();
    } else {
        // Browser: reutiliza el query client si ya existe (singleton)
        if (!browserQueryClient) browserQueryClient = makeQueryClient();
        return browserQueryClient;
    }
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
    // NOTA: Evita useState cuando inicialices el Query Client si no tienes una buena razón
    // useState solo se ejecuta una vez en el cliente, lo cual es suficiente
    const [queryClient] = useState(() => getQueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
}
