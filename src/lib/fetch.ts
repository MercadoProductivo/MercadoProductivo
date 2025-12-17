/**
 * Fetch with configurable timeout.
 * Aborts the request if it exceeds the specified timeout.
 */
export async function fetchWithTimeout(
    url: string,
    opts: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
    const { timeoutMs = 10000, ...rest } = opts;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...rest, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}
