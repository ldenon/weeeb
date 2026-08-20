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
			queryClient.invalidateQueries({ queryKey: ["ranking", userId] });
		},
	});
};

export default useSubmitMatch;
