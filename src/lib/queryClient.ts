import { QueryClient } from "@tanstack/react-query";

function createQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				// Rigueur : on évite de refetcher les données trop souvent
				// si l'utilisateur change juste de tab
				staleTime: 1000 * 60 * 5,
				// Important pour le SSR : ne pas retenter les requêtes échouées sur le serveur
				retry: false,
			},
		},
	});
}

let browserQueryClient: QueryClient | undefined;

/**
 * Un cache par requête côté serveur, un cache partagé côté navigateur.
 *
 * Un singleton de module serait partagé entre toutes les requêtes SSR, donc
 * entre tous les utilisateurs : les données d'une watchlist pourraient être
 * servies à quelqu'un d'autre.
 */
export function getQueryClient() {
	if (typeof window === "undefined") {
		return createQueryClient();
	}

	browserQueryClient ??= createQueryClient();

	return browserQueryClient;
}
