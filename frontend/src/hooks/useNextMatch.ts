import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { pb } from "@/lib/pocketbase";
import type { MatchResponse } from "@/types";

/**
 * Le prochain duel à arbitrer. L'appariement est calculé côté serveur pour
 * répartir les duels équitablement entre tous les animes de la liste.
 */
const useNextMatch = () => {
	const userId = pb.authStore.record?.id;

	return useQuery({
		queryKey: ["ranking", userId, "match"],
		enabled: Boolean(userId),
		// Un duel est consommé dès qu'il est affiché : ne jamais le resservir depuis le cache.
		staleTime: 0,
		gcTime: 0,
		queryFn: () => apiFetch<MatchResponse>("/api/weeeb/ranking/match"),
	});
};

export default useNextMatch;
