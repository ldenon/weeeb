import { QueryClient } from "@tanstack/react-query";

function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// Avoid refetching the data too often when the user merely
				// switches tabs
				staleTime: 1000 * 60 * 5,
				// Important for SSR: do not retry failed requests on the server
				retry: false,
			},
		},
	});
}

let browserQueryClient: QueryClient | undefined;

/**
 * One cache per request on the server, a shared cache in the browser.
 *
 * A module-level singleton would be shared across every SSR request, and so
 * across every user: one person's watchlist could be served to somebody else.
 */
export function getQueryClient() {
	if (typeof window === "undefined") {
		return createQueryClient();
	}

	browserQueryClient ??= createQueryClient();

	return browserQueryClient;
}
