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
 * Enregistre le résultat d'un duel. Le serveur renvoie directement le duel
 * suivant, qu'on injecte dans le cache pour enchaîner sans aller-retour.
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
