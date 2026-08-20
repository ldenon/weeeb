import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { pb } from "@/lib/pocketbase";
import type { RankingResponse } from "@/types";

/** Remet tous les scores à leur valeur de départ et efface l'historique des duels. */
const useResetRanking = () => {
	const queryClient = useQueryClient();
	const userId = pb.authStore.record?.id;

	return useMutation({
		mutationFn: () =>
			apiFetch<RankingResponse>("/api/weeeb/ranking/reset", { method: "POST" }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["ranking", userId] });
		},
	});
};

export default useResetRanking;
