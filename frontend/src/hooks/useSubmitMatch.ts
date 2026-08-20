import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { pb } from "@/lib/pocketbase";
import type { MatchOutcome, MatchResponse } from "@/types";

interface MatchResult {
	animeA: string;
	animeB: string;
	outcome: MatchOutcome;
}

/**
 * Records the result of a duel. The server returns the next duel straight away,
 * which we push into the cache so the user can carry on without a round trip.
 */
const useSubmitMatch = () => {
	const queryClient = useQueryClient();
	const userId = pb.authStore.record?.id;

	return useMutation({
		scope: { id: "ranking-match" },
		mutationFn: (result: MatchResult) =>
			apiFetch<MatchResponse>("/api/weeeb/ranking/match", {
				method: "POST",
				body: result,
			}),
		onSuccess: (next) => {
			queryClient.setQueryData(["ranking", userId, "match"], next);

			// `exact` est indispensable : sans lui l'invalidation s'applique par
			// préfixe et emporte ["ranking", userId, "match"], donc le duel que la
			// ligne précédente vient de poser. Comme useNextMatch a un staleTime
			// nul, il refetchait aussitôt et l'appariement, aléatoire, renvoyait un
			// duel différent — celui affiché était remplacé sous les yeux du votant.
			queryClient.invalidateQueries({
				queryKey: ["ranking", userId],
				exact: true,
			});
		},
	});
};

export default useSubmitMatch;
