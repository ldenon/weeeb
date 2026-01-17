import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
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
