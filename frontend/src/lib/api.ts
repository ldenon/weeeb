import { pb } from "./pocketbase";

// VITE_PB_URL peut se terminer par un "/" : sans normalisation on construit
// des URLs en "//api/..." que le navigateur refuse de suivre.
const BASE_URL = String(import.meta.env.VITE_PB_URL ?? "").replace(/\/+$/, "");

/**
 * Appelle les routes Go personnalisées de PocketBase (/api/weeeb/...).
 *
 * Le SDK PocketBase ne sait interroger que les collections ; les endpoints
 * ajoutés par les hooks passent donc par fetch, avec le même jeton d'auth.
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
