import { pb } from "./pocketbase";

// VITE_PB_URL may end with a "/": without normalising it we build "//api/..."
// URLs that the browser refuses to follow.
const BASE_URL = String(import.meta.env.VITE_PB_URL ?? "").replace(/\/+$/, "");

/**
 * Calls PocketBase's custom Go routes (/api/weeeb/...).
 *
 * The PocketBase SDK only knows how to query collections, so the endpoints added
 * by the hooks go through fetch, carrying the same auth token.
 */
export async function apiFetch<T>(
	path: string,
	init?: { method?: string; body?: unknown },
): Promise<T> {
	const response = await fetch(`${BASE_URL}${path}`, {
		method: init?.method ?? "GET",
		headers: {
			"Content-Type": "application/json",
			...(pb.authStore.token ? { Authorization: pb.authStore.token } : {}),
		},
		body: init?.body === undefined ? undefined : JSON.stringify(init.body),
	});

	if (!response.ok) {
		const details = (await response.json().catch(() => null)) as {
			message?: string;
		} | null;

		throw new Error(
			details?.message ?? `La requête a échoué (${response.status}).`,
		);
	}

	return response.json() as Promise<T>;
}
