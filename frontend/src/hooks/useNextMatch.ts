import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { pb } from "@/lib/pocketbase";
import type { MatchResponse } from "@/types";

/**
 * The next duel to settle. The matchmaking is computed server-side so that duels
 * are spread evenly across every anime in the list.
 */
const useNextMatch = () => {
	const userId = pb.authStore.record?.id;

	return useQuery({
		queryKey: ["ranking", userId, "match"],
		enabled: Boolean(userId),
		// A duel is consumed as soon as it is shown: never serve it again from cache.
		staleTime: 0,
		gcTime: 0,
		queryFn: () => apiFetch<MatchResponse>("/api/weeeb/ranking/match"),
	});
};

export default useNextMatch;
